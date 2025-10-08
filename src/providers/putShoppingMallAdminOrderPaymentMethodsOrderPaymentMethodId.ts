import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrderPaymentMethodsOrderPaymentMethodId(props: {
  admin: AdminPayload;
  orderPaymentMethodId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPaymentMethod.IUpdate;
}): Promise<IShoppingMallOrderPaymentMethod> {
  // Authorization: Ensure admin exists and is active (already checked by decorator, double check not needed)
  // Update the payment method snapshot in the DB
  const updated =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.update({
      where: { id: props.orderPaymentMethodId },
      data: {
        payment_method_type: props.body.payment_method_type,
        method_data: props.body.method_data,
        display_name: props.body.display_name,
      },
    });
  return {
    id: updated.id,
    payment_method_type: updated.payment_method_type,
    method_data: updated.method_data,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
  };
}
