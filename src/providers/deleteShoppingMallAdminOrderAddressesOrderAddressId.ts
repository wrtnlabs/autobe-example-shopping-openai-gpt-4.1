import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrderAddressesOrderAddressId(props: {
  admin: AdminPayload;
  orderAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderAddressId } = props;

  // 1. Find address snapshot by ID
  const address =
    await MyGlobal.prisma.shopping_mall_order_addresses.findUnique({
      where: { id: orderAddressId },
    });
  if (!address) throw new HttpException("Order address not found", 404);

  // 2. Check if referenced by any non-deleted, non-cancelled order
  const linkedOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shipping_address_id: orderAddressId,
      deleted_at: null,
      status: { notIn: ["cancelled"] },
    },
  });
  if (linkedOrder)
    throw new HttpException(
      "Cannot delete: This address snapshot is referenced by an active or non-cancelled order.",
      409,
    );

  // 3. Delete address snapshot (hard delete)
  await MyGlobal.prisma.shopping_mall_order_addresses.delete({
    where: { id: orderAddressId },
  });

  // 4. Record audit log in shopping_mall_admin_action_logs
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      affected_order_id: null,
      affected_customer_id: null,
      affected_seller_id: null,
      affected_product_id: null,
      affected_review_id: null,
      action_type: "delete",
      action_reason: "Admin permanently erased order address snapshot.",
      domain: "order_address",
      details_json: JSON.stringify({ orderAddressId }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
