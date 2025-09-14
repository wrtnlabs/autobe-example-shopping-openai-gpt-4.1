import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { IPageIAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list order cancellations for an order
 * (ai_commerce_order_cancellations).
 *
 * Enables a seller to search, filter, paginate, and sort cancellation requests
 * for a specific order they are linked to. The query supports multiple search
 * conditions (status, actor, time, text) and returns paginated results.
 *
 * Authorization: Only sellers with at least one item in the order can access
 * this operation.
 *
 * @param props - Seller: Authenticated SellerPayload (must match order item
 *   seller_id) orderId: UUID of the target order body: Search filters, sort and
 *   pagination (IAiCommerceOrderCancellation.IRequest)
 * @returns Paginated list of IAiCommerceOrderCancellation matching filters.
 * @throws {Error} If the requesting seller does not have access to this order
 */
export async function patchaiCommerceSellerOrdersOrderIdCancellations(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IRequest;
}): Promise<IPageIAiCommerceOrderCancellation> {
  const { seller, orderId, body } = props;

  // 1. Authorization - confirm seller is associated with this order.
  const item = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      order_id: orderId,
      seller_id: seller.id,
    },
    select: { id: true },
  });
  if (!item) {
    throw new Error(
      "Unauthorized: You do not have permission to view cancellations for this order.",
    );
  }

  // 2. Prepare pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Prepare requested_at filter (range)
  let requestedAt: { gte?: string; lte?: string } = {};
  if (body.requested_start !== undefined && body.requested_start !== null) {
    requestedAt.gte = body.requested_start;
  }
  if (body.requested_end !== undefined && body.requested_end !== null) {
    requestedAt.lte = body.requested_end;
  }

  // 4. Build where filters
  const where: Record<string, unknown> = {
    order_id: orderId,
    ...(body.status !== undefined &&
    body.status !== null &&
    body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...(body.actor_ids !== undefined &&
    body.actor_ids !== null &&
    body.actor_ids.length > 0
      ? { actor_id: { in: body.actor_ids } }
      : {}),
    ...(Object.keys(requestedAt).length > 0
      ? { requested_at: requestedAt }
      : {}),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { cancellation_code: { contains: body.search } },
            { reason: { contains: body.search } },
          ],
        }
      : {}),
  };

  // 5. Sorting - restrict allowed fields, default to requested_at
  const sortableFields = [
    "id",
    "cancellation_code",
    "reason",
    "status",
    "requested_at",
    "approved_at",
    "finalized_at",
  ];
  const sortField =
    body.sort_by && sortableFields.includes(body.sort_by)
      ? body.sort_by
      : "requested_at";
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: sortDir };

  // 6. Fetch data (use Promise.all for total count and rows)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_cancellations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_cancellations.count({ where }),
  ]);

  // 7. Map results to DTO (handle null/undefined distinctions, use toISOStringSafe for dates)
  const data = rows.map((r) => ({
    id: r.id,
    order_id: r.order_id,
    actor_id: r.actor_id,
    cancellation_code: r.cancellation_code,
    reason: r.reason === null || r.reason === undefined ? undefined : r.reason,
    status: r.status,
    requested_at: toISOStringSafe(r.requested_at),
    ...(r.approved_at !== undefined
      ? {
          approved_at:
            r.approved_at === null ? null : toISOStringSafe(r.approved_at),
        }
      : {}),
    ...(r.finalized_at !== undefined
      ? {
          finalized_at:
            r.finalized_at === null ? null : toISOStringSafe(r.finalized_at),
        }
      : {}),
  }));

  // 8. Compose pagination object (strip branding via Number for compatibility)
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
