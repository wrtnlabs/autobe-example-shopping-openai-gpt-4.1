import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { IPageIAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderCancellation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and list order cancellations for an order
 * (ai_commerce_order_cancellations).
 *
 * This endpoint enables an authenticated buyer to retrieve a paginated list of
 * all cancellation requests associated with a specific order. The result can be
 * filtered and sorted by status, actor(s), time window, or a free-text search
 * (applied to reason and cancellation_code fields), and supports full
 * pagination for UI display or analytics.
 *
 * Authorization: Only the buyer who owns the order can access its cancellation
 * requests.
 *
 * @param props - Properties for cancellation search
 * @param props.buyer - The authenticated buyer
 * @param props.orderId - UUID of the order being queried
 * @param props.body - Filtering, sorting, and pagination options
 * @returns Paginated list of cancellation requests matching the filters
 * @throws {Error} If the order does not exist or the buyer is not authorized
 */
export async function patchaiCommerceBuyerOrdersOrderIdCancellations(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IRequest;
}): Promise<IPageIAiCommerceOrderCancellation> {
  const { buyer, orderId, body } = props;

  // 1. Fetch order and ensure authorization
  const order = await MyGlobal.prisma.ai_commerce_orders.findUniqueOrThrow({
    where: { id: orderId },
    select: { buyer_id: true },
  });
  if (order.buyer_id !== buyer.id) {
    throw new Error(
      "Unauthorized: You may only view cancellations on your own orders.",
    );
  }

  // 2. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 3. Query condition
  const where = {
    order_id: orderId,
    ...(body.status &&
      body.status.length > 0 && { status: { in: body.status } }),
    ...(body.actor_ids &&
      body.actor_ids.length > 0 && { actor_id: { in: body.actor_ids } }),
    ...(body.requested_start || body.requested_end
      ? {
          requested_at: {
            ...(body.requested_start && { gte: body.requested_start }),
            ...(body.requested_end && { lte: body.requested_end }),
          },
        }
      : {}),
    ...(body.search
      ? {
          OR: [
            { reason: { contains: body.search } },
            { cancellation_code: { contains: body.search } },
          ],
        }
      : {}),
  };

  // 4. Sorting (only allow safe fields)
  const allowedSortFields = [
    "requested_at",
    "status",
    "cancellation_code",
    "approved_at",
    "finalized_at",
  ];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by as (typeof allowedSortFields)[number])
    : "requested_at";
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";

  // 5. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_cancellations.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: Number(limit),
      select: {
        id: true,
        order_id: true,
        actor_id: true,
        cancellation_code: true,
        reason: true,
        status: true,
        requested_at: true,
        approved_at: true,
        finalized_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_order_cancellations.count({ where }),
  ]);

  // 6. Map output, ensuring date-time conversions
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    actor_id: row.actor_id,
    cancellation_code: row.cancellation_code,
    reason: row.reason ?? undefined,
    status: row.status,
    requested_at: toISOStringSafe(row.requested_at),
    approved_at:
      typeof row.approved_at === "object" && row.approved_at !== null
        ? toISOStringSafe(row.approved_at)
        : row.approved_at === null
          ? null
          : undefined,
    finalized_at:
      typeof row.finalized_at === "object" && row.finalized_at !== null
        ? toISOStringSafe(row.finalized_at)
        : row.finalized_at === null
          ? null
          : undefined,
  }));

  // 7. Pagination info
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
