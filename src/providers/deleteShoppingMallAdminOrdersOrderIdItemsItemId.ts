import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the order item, ensure it belongs to the order
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  // Only allow deletion if the item is not paid, fulfilled, or delivered
  const status = item.status;
  if (status === "paid" || status === "fulfilled" || status === "delivered") {
    throw new HttpException(
      `Cannot delete order item in '${status}' state`,
      409,
    );
  }

  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: props.itemId },
  });

  // Optionally log audit here (not implemented)
}
