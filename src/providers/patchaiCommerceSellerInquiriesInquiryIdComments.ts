import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get paginated list of comments under a specific inquiry
 * (ai_commerce_comments).
 *
 * Retrieves a paginated, filtered list of comments associated with a given
 * inquiry. Only returns comments if the authenticated seller owns the product
 * related to the inquiry. Supports advanced filtering (author, status,
 * created_at range, text search), sorting, and pagination.
 *
 * @param props - Props containing the authenticated seller, inquiryId, and
 *   optional filtering, sorting, and paging options
 * @param props.seller - The authenticated seller making the request
 * @param props.inquiryId - The unique inquiry ID to fetch comments for
 * @param props.body - Advanced search, filter, and pagination options
 * @returns Paginated list and summary of comments matching filters on this
 *   inquiry
 * @throws {Error} If the inquiry, product, or seller ownership is invalid
 * @throws {Error} If the seller is unauthorized to view comments for this
 *   inquiry
 */
export async function patchaiCommerceSellerInquiriesInquiryIdComments(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IPageIAiCommerceComment.ISummary> {
  // 1. Authorization step: Ensure inquiry exists and product belongs to seller
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: { id: props.inquiryId },
    select: { id: true, product_id: true },
  });
  if (!inquiry) throw new Error("Inquiry not found");
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: inquiry.product_id },
    select: { id: true, seller_id: true },
  });
  if (!product) throw new Error("Product not found for inquiry");
  if (product.seller_id !== props.seller.id) {
    throw new Error("Unauthorized: Seller does not own this product");
  }

  // 2. Pagination setup
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;

  // 3. Build where filter inline
  const where = {
    inquiry_id: props.inquiryId,
    deleted_at: null,
    ...(props.body.author_id !== undefined &&
      props.body.author_id !== null && {
        author_id: props.body.author_id,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.parent_comment_id !== undefined &&
      props.body.parent_comment_id !== null && {
        parent_comment_id: props.body.parent_comment_id,
      }),
    ...(props.body.bulletin_id !== undefined &&
      props.body.bulletin_id !== null && {
        bulletin_id: props.body.bulletin_id,
      }),
    ...(props.body.review_id !== undefined &&
      props.body.review_id !== null && {
        review_id: props.body.review_id,
      }),
    ...((props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined &&
              props.body.created_at_from !== null && {
                gte: props.body.created_at_from,
              }),
            ...(props.body.created_at_to !== undefined &&
              props.body.created_at_to !== null && {
                lte: props.body.created_at_to,
              }),
          },
        }
      : {}),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.length > 0 && {
        body: { contains: props.body.search },
      }),
  };

  // 4. Sorting logic
  const allowedSortFields = ["created_at", "updated_at", "status", "author_id"];
  const sortBy = allowedSortFields.includes(props.body.sort_by ?? "created_at")
    ? (props.body.sort_by ?? "created_at")
    : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  // 5. Fetch paginated data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
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
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
  ]);

  // 6. Map rows to ISummary with correct formatting for dates (no Date type anywhere!)
  const data = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    body: row.body,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 7. Compose pagination object
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
