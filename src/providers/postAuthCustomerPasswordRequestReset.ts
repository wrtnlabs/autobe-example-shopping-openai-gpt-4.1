import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerPasswordRequestReset(props: {
  body: IShoppingMallCustomer.IRequestPasswordReset;
}): Promise<IShoppingMallCustomer.IPasswordResetRequestResult> {
  // Always return the same response for privacy (anti-enumeration)
  const { email } = props.body;

  // Query for customer existence, select only id (no data leakage)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email },
    select: { id: true },
  });

  if (customer) {
    // Base time in ISO string (current time)
    const millis = Date.now();
    const created_at = toISOStringSafe(new Date(millis));
    // 1 hour expiry in the future as ISO string
    const expires_at = toISOStringSafe(new Date(millis + 60 * 60 * 1000));
    // Insert new password reset record fully typed (no as, no Date type)
    await MyGlobal.prisma.shopping_mall_password_resets.create({
      data: {
        id: v4(),
        user_id: customer.id,
        token: v4(),
        expires_at: expires_at,
        used_at: null,
        created_at: created_at,
      },
    });
  }
  return { result: "accepted" };
}
