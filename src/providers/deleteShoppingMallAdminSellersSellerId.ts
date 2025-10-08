import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Block if seller has any active/pending orders.
  // Define terminal statuses. Assume 'cancelled' and 'delivered' as terminal.
  const terminalStatuses = ["cancelled", "delivered"];
  const openOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shopping_mall_seller_id: props.sellerId,
      status: {
        notIn: terminalStatuses,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (openOrder) {
    throw new HttpException(
      "Cannot delete seller: seller has active or pending order obligations.",
      409,
    );
  }

  // 2. Perform hard delete: use delete not update. Throws 404 if not found.
  await MyGlobal.prisma.shopping_mall_sellers.delete({
    where: { id: props.sellerId },
  });

  // 3. Insert audit log of this admin-performed action (to action logs table).
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      affected_seller_id: props.sellerId,
      action_type: "erase",
      action_reason: "Permanently deleted seller account via admin operation.",
      domain: "seller",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
