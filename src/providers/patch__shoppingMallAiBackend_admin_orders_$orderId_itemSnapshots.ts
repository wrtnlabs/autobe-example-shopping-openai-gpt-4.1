import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItemSnapshot";
import { IPageIShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderItemSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List paginated order item snapshots (version histories) for an order.
 *
 * This operation retrieves a paginated, filterable list of order item snapshots
 * (versioned histories) for the given order. Used for auditing, dispute
 * resolution, or compliance inspection, this endpoint presents the immutable
 * state of items at specific points in time. Snapshots are stored in the
 * shopping_mall_ai_backend_order_item_snapshots table. Only system
 * administrators and designated auditors can access this resource, due to its
 * sensitive nature. Supports pagination and filtering by item ID, snapshot
 * reason, or timestamp.
 *
 * @param props - Request properties
 * @param props.admin - Validated admin authentication payload (system operator)
 * @param props.orderId - UUID of the order to retrieve snapshots for
 * @param props.body - Search & filter criteria for the snapshots (pagination,
 *   item id, reason etc)
 * @returns Paginated set of order item snapshots matching the filter for the
 *   order, as IPageIShoppingMallAiBackendOrderItemSnapshot
 * @throws {Error} If unauthorized, or if invalid orderId (bad uuid or not
 *   found)
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_itemSnapshots({
  admin,
  orderId,
  body,
}: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderItemSnapshot> {
  // Authorization enforced via decorator

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Defensive: Validate order exists
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
    });
  if (!order) throw new Error("Order not found");

  // Step 1: Get all order item IDs for the given order
  const orderItems =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_items.findMany({
      where: { shopping_mall_ai_backend_order_id: orderId },
      select: { id: true },
    });
  const orderItemIds = orderItems.map((i) => i.id);

  // Step 2: If no order items, return early (empty)
  if (orderItemIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 3: Build dynamic where filter for snapshots (avoid duplicate key)
  let snapshotWhere: Record<string, any> = {
    // Always restrict to order item IDs for this order
    shopping_mall_ai_backend_order_item_id: { in: orderItemIds },
  };

  // If filter by specific order_item_id: restrict to that only (override in-filter)
  if (body.order_item_id) {
    snapshotWhere.shopping_mall_ai_backend_order_item_id = body.order_item_id;
  }
  if (body.snapshot_reason) {
    snapshotWhere.snapshot_reason = body.snapshot_reason;
  }
  if (body.created_at) {
    snapshotWhere.created_at = body.created_at;
  }

  // Step 4: Fetch paginated snapshots and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_item_snapshots.findMany({
      where: snapshotWhere,
      orderBy: { created_at: "desc" as const },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_item_snapshots.count({
      where: snapshotWhere,
    }),
  ]);

  // Step 5: Map database rows to DTO structure, normalizing date and brand types
  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    order_item_id: row.shopping_mall_ai_backend_order_item_id as string &
      tags.Format<"uuid">,
    snapshot_reason: row.snapshot_reason,
    quantity: row.quantity, // Should be int32, already correct
    unit_price: row.unit_price,
    discount_amount: row.discount_amount,
    final_amount: row.final_amount,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total > 0 ? Math.ceil(total / Number(limit)) : 0,
    },
    data,
  };
}
