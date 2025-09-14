import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { IPageIAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderStatusHistory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Paginated search of status history (ai_commerce_order_status_history) for a
 * specific order.
 *
 * Retrieves a paginated, filterable, and sortable list of all status-change
 * events affecting a single order for a buyer. This API allows buyers to review
 * lifecycle status transitions for their own order, supporting audit,
 * compliance, and support scenarios. Filters include actor, status, and
 * date/time ranges. Pagination ensures efficient browsing for orders with many
 * transitions. Only a buyer who owns the order may query the history for that
 * order. Errors are thrown for unauthorized or non-existent orders.
 *
 * @param props - Endpoint input including the authenticated buyer payload,
 *   target order ID, and filter/pagination criteria.
 * @param props.buyer - Authenticated buyer making the request. Must be the
 *   owner of the order.
 * @param props.orderId - UUID identifier for the target order whose status
 *   history is to be listed.
 * @param props.body - Filtering and pagination request, including actor,
 *   status, date ranges, and page/limit.
 * @returns Paginated list of IAiCommerceOrderStatusHistory matching the
 *   criteria for the specified order.
 * @throws {Error} If the order does not exist or is not owned by the buyer.
 */
export async function patchaiCommerceBuyerOrdersOrderIdStatusHistory(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderStatusHistory.IRequest;
}): Promise<IPageIAiCommerceOrderStatusHistory> {
  const { buyer, orderId, body } = props;

  // 1. Authorization: Buyer must own the order
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId, buyer_id: buyer.id },
  });
  if (!order) throw new Error("Order not found or access denied.");

  // 2. Setup filters, defaults, and validate/sanitize input
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const sort_by = body.sort_by === "changed_at" ? "changed_at" : "changed_at"; // only allowed
  const sort_direction = body.sort_direction === "desc" ? "desc" : "asc";

  // Build where clause
  const where = {
    order_id: orderId,
    ...(body.actor_id !== undefined && body.actor_id !== null
      ? { actor_id: body.actor_id }
      : {}),
    ...(body.old_status !== undefined && body.old_status !== null
      ? { old_status: body.old_status }
      : {}),
    ...(body.new_status !== undefined && body.new_status !== null
      ? { new_status: body.new_status }
      : {}),
    ...(body.changed_at_from !== undefined || body.changed_at_to !== undefined
      ? {
          changed_at: {
            ...(body.changed_at_from !== undefined &&
            body.changed_at_from !== null
              ? { gte: body.changed_at_from }
              : {}),
            ...(body.changed_at_to !== undefined && body.changed_at_to !== null
              ? { lte: body.changed_at_to }
              : {}),
          },
        }
      : {}),
  };

  // 3. Pagination calculation
  const skip = (page - 1) * limit;
  const take = limit;

  // 4. Sorting: only allow changed_at (safe, indexed)
  // Always define orderBy inline
  const orderBy = [{ [sort_by]: sort_direction }];

  // 5. Query DB in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_status_history.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.ai_commerce_order_status_history.count({ where }),
  ]);

  // 6. Map DB objects to DTO (convert Date to string for changed_at)
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    actor_id: row.actor_id,
    old_status: row.old_status,
    new_status: row.new_status,
    old_business_status: row.old_business_status ?? null,
    new_business_status: row.new_business_status ?? null,
    note: row.note ?? null,
    changed_at: toISOStringSafe(row.changed_at),
  }));

  // 7. Return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / Number(limit)),
    },
    data,
  };
}
