import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { IPageIAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list reviews with advanced filtering (ai_commerce_reviews).
 *
 * Returns a paginated, filtered list of reviews. Allows advanced filtering
 * including author_id, order_item_id, search keyword (body), and status, and
 * supports pagination and sorting. Only accessible by admins.
 *
 * @param props - Provider parameters
 * @param props.admin - Authenticated admin user (must be active)
 * @param props.body - Filter and pagination options for review search
 * @returns Paginated page of review summaries for UI display
 * @throws {Error} When database or system errors occur
 */
export async function patchaiCommerceAdminReviews(props: {
  admin: AdminPayload;
  body: IAiCommerceReview.IRequest;
}): Promise<IPageIAiCommerceReview.ISummary> {
  const { body } = props;
  // Use defaults for missing page/limit and ensure plain number for compatibility
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause only with defined values, never use null for missing fields
  const where = {
    deleted_at: null,
    ...(body.order_item_id !== undefined && {
      order_item_id: body.order_item_id,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.author_id !== undefined && { author_id: body.author_id }),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        body: { contains: body.search },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_reviews.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      // Only select necessary fields for ISummary structure
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
    MyGlobal.prisma.ai_commerce_reviews.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((r) => ({
      id: r.id,
      author_id: r.author_id,
      order_item_id: r.order_item_id,
      rating: r.rating,
      body: r.body,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
