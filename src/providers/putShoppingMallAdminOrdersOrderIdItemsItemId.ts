import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const { orderId, itemId, body } = props;
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }
  if (["fulfilled", "shipped", "cancelled"].includes(item.status)) {
    throw new HttpException(
      "Cannot update order item after fulfillment, shipment, or cancellation.",
      400,
    );
  }
  // Use a mutable object for updates to allow dynamic keys
  const updates: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.status !== undefined) updates.status = body.status;
  if (body.final_price !== undefined) updates.final_price = body.final_price;

  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: itemId },
    data: updates,
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      updated.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    final_price: updated.final_price,
    discount_snapshot: updated.discount_snapshot ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
