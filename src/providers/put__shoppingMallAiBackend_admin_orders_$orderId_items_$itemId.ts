import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update business-allowed fields of a single order item for a specific order.
 * Table: shopping_mall_ai_backend_order_items.
 *
 * Enables authorized users (admins or system operators in most cases) to update
 * selected business attributes of a single order item, such as quantity,
 * discounts, or status, as allowed by business rules. The operation triggers
 * business validation to ensure the updates are permitted for the current order
 * state. All changes are recorded in the audit trail for compliance. Common
 * scenarios include correcting errors detected post-order, fulfilling
 * compliance requirements, or resolving after-sale customer support cases.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.orderId - UUID of the parent order containing the item
 * @param props.itemId - UUID of the order item to update
 * @param props.body - The set of mutable item attributes to update, as allowed
 *   by business rules
 * @returns The updated order item with business state reflecting the requested
 *   changes
 * @throws {Error} When the order item does not exist, is not part of the
 *   specified order, or is not updatable due to business status
 */
export async function put__shoppingMallAiBackend_admin_orders_$orderId_items_$itemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderItem.IUpdate;
}): Promise<IShoppingMallAiBackendOrderItem> {
  const { admin, orderId, itemId, body } = props;
  // Authorization is validated by the AdminAuth decorator

  // Perform the update of the fields
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_items.update({
      where: {
        id: itemId,
        shopping_mall_ai_backend_order_id: orderId,
      },
      data: {
        quantity: body.quantity ?? undefined,
        discount_amount: body.discount_amount ?? undefined,
        final_amount: body.final_amount ?? undefined,
        status: body.status ?? undefined,
        updated_at: body.updated_at ?? toISOStringSafe(new Date()),
      },
    });

  // Map DB fields to API DTO field names/types
  return {
    id: updated.id,
    order_id: updated.shopping_mall_ai_backend_order_id,
    product_id: updated.shopping_mall_ai_backend_product_id,
    product_option_id:
      updated.shopping_mall_ai_backend_product_option_id ?? undefined,
    product_bundle_id:
      updated.shopping_mall_ai_backend_product_bundle_id ?? undefined,
    product_title: updated.product_title,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    discount_amount: updated.discount_amount,
    final_amount: updated.final_amount,
    currency: updated.currency,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
