import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IAiCommercePageIComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve and filter comments for a specific review (ai_commerce_comments
 * table).
 *
 * This function fetches paginated and filtered comments attached to a review
 * specified by reviewId, only allowing access for the seller of the product
 * associated with the review. Filtering, pagination, search, and sorting are
 * supported as defined in IAiCommerceComment.IRequest. The function carefully
 * verifies seller access and converts date fields as required. All responses
 * strictly match the IAiCommercePageIComment.ISummary structure. Throws
 * detailed errors for unauthorized access or missing resources.
 *
 * @param props - The context for the request
 * @param props.seller - The authenticated seller making the request
 * @param props.reviewId - The UUID of the review whose comments are requested
 * @param props.body - Advanced query (filter/pagination/search/sort) per
 *   IAiCommerceComment.IRequest
 * @returns IAiCommercePageIComment.ISummary, a paginated summary result of
 *   comments for the review
 * @throws {Error} If the review is not found, the seller does not own the
 *   product, or some required relation is missing
 */
export async function patchaiCommerceSellerReviewsReviewIdComments(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IAiCommercePageIComment.ISummary> {
  const { seller, reviewId, body } = props;

  // 1. Ensure the review exists and is not deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });
  if (!review) throw new Error("Review not found");

  // 2. Check access: traverse review -> order_item -> variant -> product
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: review.order_item_id,
    },
  });
  if (!orderItem) throw new Error("Order item not found");
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
    where: {
      id: orderItem.product_variant_id,
    },
  });
  if (!variant) throw new Error("Product variant not found");
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: variant.product_id,
    },
  });
  if (!product) throw new Error("Product not found");

  // Only the seller of the product is allowed
  if (product.seller_id !== seller.id) {
    throw new Error("Unauthorized: Seller does not own this product/review");
  }

  // 3. Build query filter
  const where = {
    review_id: reviewId,
    deleted_at: null,
    ...(body.author_id !== undefined && {
      author_id: body.author_id,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.parent_comment_id !== undefined && {
      parent_comment_id: body.parent_comment_id,
    }),
    ...(body.bulletin_id !== undefined && { bulletin_id: body.bulletin_id }),
    ...(body.inquiry_id !== undefined && { inquiry_id: body.inquiry_id }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        body: { contains: body.search },
      }),
  };

  // 4. Compute pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 5. Sorting (fix: explicit if/else to avoid dynamic computed property name)
  const allowedSortFields = ["created_at", "updated_at", "status"] as const;
  const sortBy = allowedSortFields.includes(body.sort_by as any)
    ? body.sort_by
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Use explicit branches for orderBy to guarantee valid keys for Prisma
  let orderBy: {
    created_at?: "asc" | "desc";
    updated_at?: "asc" | "desc";
    status?: "asc" | "desc";
  };
  if (sortBy === "updated_at") {
    orderBy = { updated_at: sortOrder };
  } else if (sortBy === "status") {
    orderBy = { status: sortOrder };
  } else {
    orderBy = { created_at: sortOrder };
  }

  // 6. Query total and paginated data in parallel
  const [total, comments] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        author_id: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  // 7. Map to IAiCommerceComment.ISummary, converting dates
  const data = comments.map((c) => ({
    id: c.id,
    author_id: c.author_id,
    body: c.body,
    status: c.status,
    created_at: toISOStringSafe(c.created_at),
    updated_at: toISOStringSafe(c.updated_at),
  }));

  // 8. Output matches IAiCommercePageIComment.ISummary
  return {
    total,
    page,
    limit,
    data,
  };
}
