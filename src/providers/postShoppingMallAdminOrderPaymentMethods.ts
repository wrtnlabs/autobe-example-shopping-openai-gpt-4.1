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

export async function postShoppingMallAdminOrderPaymentMethods(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderPaymentMethod.ICreate;
}): Promise<IShoppingMallOrderPaymentMethod> {
  const now = toISOStringSafe(new Date());
  const id = v4();
  const created =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.create({
      data: {
        id: id,
        payment_method_type: props.body.payment_method_type,
        method_data: props.body.method_data,
        display_name: props.body.display_name,
        created_at: now,
      },
    });
  return {
    id: created.id,
    payment_method_type: created.payment_method_type,
    method_data: created.method_data,
    display_name: created.display_name,
    created_at: toISOStringSafe(created.created_at),
  };
}
