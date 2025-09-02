import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItemSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a single order item snapshot for a given order and snapshot ID.
 *
 * Fetches the full details of a single order item snapshot for a given order,
 * including all versioned attributes and audit trail information. Requires both
 * order ID and item snapshot ID. Intended for use cases such as compliance
 * review, legal investigation, or detailed dispute trace. Security controls
 * ensure only eligible admin/compliance users can access detailed snapshot
 * data. Attempts to access an invalid or unrelated snapshot ID will result in
 * an error. The schema is enforced strictly to comply with legal and regulatory
 * evidence standards.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the lookup
 * @param props.orderId - The order UUID to scope the item snapshot
 * @param props.itemSnapshotId - The snapshot's unique ID (uuid)
 * @returns The requested order item snapshot with full historical data
 * @throws {Error} When the snapshot does not exist or does not belong to given
 *   order
 */
export async function get__shoppingMallAiBackend_admin_orders_$orderId_itemSnapshots_$itemSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderItemSnapshot> {
  const { orderId, itemSnapshotId } = props;

  // Lookup snapshot by ID
  const snapshot =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_item_snapshots.findUnique(
      {
        where: { id: itemSnapshotId },
        select: {
          id: true,
          shopping_mall_ai_backend_order_item_id: true,
          snapshot_reason: true,
          quantity: true,
          unit_price: true,
          discount_amount: true,
          final_amount: true,
          created_at: true,
        },
      },
    );
  if (!snapshot) {
    throw new Error("Order item snapshot not found");
  }

  // Lookup parent order item and check it matches orderId
  const orderItem =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_items.findUnique({
      where: { id: snapshot.shopping_mall_ai_backend_order_item_id },
      select: { shopping_mall_ai_backend_order_id: true },
    });
  if (!orderItem || orderItem.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Order item snapshot does not belong to given order");
  }

  return {
    id: snapshot.id,
    order_item_id: snapshot.shopping_mall_ai_backend_order_item_id,
    snapshot_reason: snapshot.snapshot_reason,
    quantity: snapshot.quantity,
    unit_price: snapshot.unit_price,
    discount_amount: snapshot.discount_amount,
    final_amount: snapshot.final_amount,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
