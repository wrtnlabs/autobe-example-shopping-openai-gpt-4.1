import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId } = props;
  // 1. Lookup: make sure customer exists and not already deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }
  // 2. Compliance blocks: block if unresolved orders or refunds exist (minimal implementation, check open order or refund)
  const openOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shopping_mall_customer_id: customerId,
      deleted_at: null,
      status: { notIn: ["cancelled", "delivered", "refunded"] },
    },
  });
  if (openOrder) {
    throw new HttpException("Cannot delete customer with open orders", 409);
  }
  const unresolvedRefund =
    await MyGlobal.prisma.shopping_mall_order_refunds.findFirst({
      where: {
        initiator_customer_id: customerId,
        status: { notIn: ["denied", "completed", "failed"] },
      },
    });
  if (unresolvedRefund) {
    throw new HttpException(
      "Cannot delete customer with unresolved refund",
      409,
    );
  }
  // 3. Soft delete (set deleted_at = now for audit/tombstone tracking)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customerId },
    data: { deleted_at: now },
  });
  // 4. Hard delete (irreversible)
  await MyGlobal.prisma.shopping_mall_customers.delete({
    where: { id: customerId },
  });
}
