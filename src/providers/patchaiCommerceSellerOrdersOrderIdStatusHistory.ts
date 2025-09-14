import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { IPageIAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Paginated search of status history (ai_commerce_order_status_history) for a
 * specific order.
 *
 * Retrieves a paginated, filterable list of order status change events for a
 * given order. Only sellers who are assigned to a suborder for the order may
 * view its status history. Filters and sorts history records as requested,
 * supporting full audit and compliance scenarios.
 *
 * @param props - Request parameters including authenticated seller info,
 *   orderId path parameter, and status history search body.
 * @param props.seller - The authenticated seller payload (must be assigned to a
 *   suborder in the order).
 * @param props.orderId - The target order's UUID.
 * @param props.body - Filtering, sorting, and pagination parameters.
 * @returns Paginated result containing matching order status history records.
 * @throws {Error} If the order does not exist or the seller is not authorized
 *   to view.
 */
export async function patchaiCommerceSellerOrdersOrderIdStatusHistory(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderStatusHistory.IRequest;
}): Promise<IPageIAiCommerceOrderStatusHistory> {
  const { seller, orderId, body } = props;

  // 1. Verify the order exists
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("Order not found");

  // 2. Authorization: Seller must be assigned to a suborder
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: { order_id: orderId, seller_id: seller.id },
  });
  if (!subOrder) {
    throw new Error("Forbidden: Seller does not have access to this order");
  }

  // 3. Pagination and sorting
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const skip = (page - 1) * limit;
  // Sort handling
  const allowedSortFields = [
    "changed_at",
    "old_status",
    "new_status",
    "actor_id",
  ];
  const rawSortBy = body.sort_by ?? "changed_at";
  const sortBy = allowedSortFields.includes(rawSortBy)
    ? rawSortBy
    : "changed_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // 4. Build where clause for filters (skip undefined/null for required fields)
  const where: Record<string, unknown> = {
    order_id: orderId,
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.old_status !== undefined &&
      body.old_status !== null && { old_status: body.old_status }),
    ...(body.new_status !== undefined &&
      body.new_status !== null && { new_status: body.new_status }),
    ...((body.changed_at_from !== undefined && body.changed_at_from !== null) ||
    (body.changed_at_to !== undefined && body.changed_at_to !== null)
      ? {
          changed_at: {
            ...(body.changed_at_from !== undefined &&
              body.changed_at_from !== null && { gte: body.changed_at_from }),
            ...(body.changed_at_to !== undefined &&
              body.changed_at_to !== null && { lte: body.changed_at_to }),
          },
        }
      : {}),
  };

  // 5. Fetch data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_status_history.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_status_history.count({ where }),
  ]);

  // 6. Map to DTO format, handling dates and nullable fields properly
  const data: IAiCommerceOrderStatusHistory[] = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    actor_id: row.actor_id,
    old_status: row.old_status,
    new_status: row.new_status,
    old_business_status: row.old_business_status ?? undefined,
    new_business_status: row.new_business_status ?? undefined,
    note: row.note ?? undefined,
    changed_at: toISOStringSafe(row.changed_at),
  }));

  // 7. Construct paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data,
  };
}
