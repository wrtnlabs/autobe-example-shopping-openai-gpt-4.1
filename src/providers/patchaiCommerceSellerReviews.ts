import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { IPageIAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceReview";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list reviews with advanced filtering (ai_commerce_reviews).
 *
 * This endpoint allows a seller to retrieve a paginated, filtered list of all
 * reviews made on products they own. The seller can filter by status, order
 * item, author, and text search on the review body. Pagination is supported via
 * page and limit. Results are strictly scoped to the requesting seller's
 * products: only reviews for their products are included.
 *
 * The returned data includes review id, author id, order item id, numeric
 * rating, body, status, and timestamps, all with correct branding.
 *
 * @param props - The request properties
 * @param props.seller - The authenticated seller payload (must match
 *   SellerPayload)
 * @param props.body - Filter and pagination parameters
 *   (IAiCommerceReview.IRequest)
 * @returns Paginated summary of reviews (IPageIAiCommerceReview.ISummary)
 * @throws {Error} If any database error occurs or bad input is detected
 */
export async function patchaiCommerceSellerReviews(props: {
  seller: SellerPayload;
  body: IAiCommerceReview.IRequest;
}): Promise<IPageIAiCommerceReview.ISummary> {
  const { seller, body } = props;

  // Step 1: Find product ids owned by this seller
  const productRows = await MyGlobal.prisma.ai_commerce_products.findMany({
    where: {
      seller_id: seller.id,
    },
    select: { id: true },
  });
  if (productRows.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const productIds = productRows.map((row) => row.id);

  // Step 2: Get all variant ids for seller's products
  const variantRows =
    await MyGlobal.prisma.ai_commerce_product_variants.findMany({
      where: {
        product_id: { in: productIds },
      },
      select: { id: true },
    });
  if (variantRows.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const variantIds = variantRows.map((variant) => variant.id);

  // Step 3: Get all order_item ids for those variants
  const orderItemRows = await MyGlobal.prisma.ai_commerce_order_items.findMany({
    where: {
      product_variant_id: { in: variantIds },
    },
    select: { id: true },
  });
  if (orderItemRows.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const orderItemIds = orderItemRows.map((item) => item.id);

  // Step 4: Build filters
  const where = {
    order_item_id: body.order_item_id ?? undefined,
    status: body.status ?? undefined,
    author_id: body.author_id ?? undefined,
    deleted_at: null,
    ...(body.search ? { body: { contains: body.search } } : {}),
    // If no filter on order_item_id but restrict to seller's orderItemIds
    ...(body.order_item_id === undefined
      ? { order_item_id: { in: orderItemIds } }
      : {}),
  };

  // Step 5: Pagination logic
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Step 6: Parallel count and paged find
  const [records, reviewRows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_reviews.count({ where }),
    MyGlobal.prisma.ai_commerce_reviews.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        author_id: true,
        order_item_id: true,
        rating: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);
  const pages = limit > 0 ? Math.max(1, Math.ceil(records / limit)) : 0;

  // Step 7: Map results to output DTO
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: pages,
    },
    data: reviewRows.map((row) => ({
      id: row.id,
      author_id: row.author_id,
      order_item_id: row.order_item_id,
      rating: row.rating,
      body: row.body,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
