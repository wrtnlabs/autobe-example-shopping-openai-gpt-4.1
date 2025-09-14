import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { IPageIAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceReview";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and list reviews with advanced filtering (ai_commerce_reviews).
 *
 * Returns a paginated, filtered list of reviews authored by the current buyer.
 * Supports filtering by status, order_item_id, and keyword search within review
 * bodies. Pagination is supported via page and limit parameters. The endpoint
 * never allows buyers to impersonate or query reviews of other users: author_id
 * is always locked to the authenticated buyer. Results include only summary
 * fields. No type assertion or native Date usage anywhere; all dates are
 * formatted as string & tags.Format<'date-time'>. All functional, immutable,
 * and consistent.
 *
 * @param props - Properties for the request.
 * @param props.buyer - Authenticated BuyerPayload containing user id and role.
 * @param props.body - Filter and pagination input (IAiCommerceReview.IRequest)
 * @returns Paginated list of review summaries and pagination info.
 * @throws {Error} If Prisma throws on query execution (input is assumed valid
 *   per global policy)
 */
export async function patchaiCommerceBuyerReviews(props: {
  buyer: BuyerPayload;
  body: IAiCommerceReview.IRequest;
}): Promise<IPageIAiCommerceReview.ISummary> {
  const { buyer, body } = props;

  // Compute pagination parameters with defaults
  const pageNum = body.page ?? 1;
  const limitNum = body.limit ?? 20;
  const skipNum = (Number(pageNum) - 1) * Number(limitNum);

  // Build Prisma where clause for current buyer only
  const where = {
    author_id: buyer.id,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.order_item_id !== undefined &&
      body.order_item_id !== null && { order_item_id: body.order_item_id }),
    ...(body.search !== undefined &&
      body.search !== null && { body: { contains: body.search } }),
  };

  // Query reviews and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_reviews.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: Number(skipNum),
      take: Number(limitNum),
    }),
    MyGlobal.prisma.ai_commerce_reviews.count({ where }),
  ]);

  // Format result data with proper branding for date-time
  const data = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    order_item_id: row.order_item_id,
    rating: row.rating,
    body: row.body,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Compose pagination info with proper int32 types
  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / Number(limitNum)),
    },
    data,
  };
}
