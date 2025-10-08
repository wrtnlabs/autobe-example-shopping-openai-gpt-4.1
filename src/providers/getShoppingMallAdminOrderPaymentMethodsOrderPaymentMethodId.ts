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

export async function getShoppingMallAdminOrderPaymentMethodsOrderPaymentMethodId(props: {
  admin: AdminPayload;
  orderPaymentMethodId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderPaymentMethod> {
  const record =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.findUnique({
      where: { id: props.orderPaymentMethodId },
    });
  if (!record) throw new HttpException("Payment method not found", 404);
  return {
    id: record.id,
    payment_method_type: record.payment_method_type,
    method_data: record.method_data,
    display_name: record.display_name,
    created_at: toISOStringSafe(record.created_at),
  };
}
