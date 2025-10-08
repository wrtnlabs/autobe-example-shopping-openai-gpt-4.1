import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrderPaymentMethodsOrderPaymentMethodId(props: {
  admin: AdminPayload;
  orderPaymentMethodId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization (admin already validated by decorator, but explicit usage for clarity)
  const { admin, orderPaymentMethodId } = props;
  // Ensure the payment method exists
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.findUnique({
      where: { id: orderPaymentMethodId },
    });
  if (!paymentMethod) {
    throw new HttpException("Order payment method not found", 404);
  }
  try {
    await MyGlobal.prisma.shopping_mall_order_payment_methods.delete({
      where: { id: orderPaymentMethodId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      // P2003: Foreign key constraint failed
      throw new HttpException(
        "Cannot delete payment method: It is referenced by one or more orders or payment records.",
        409,
      );
    }
    throw err;
  }
}
