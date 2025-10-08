import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerEmailRequestVerification(props: {
  body: IShoppingMallCustomer.IRequestEmailVerification;
}): Promise<IShoppingMallCustomer.IEmailVerificationRequestResult> {
  const { email } = props.body;
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email,
      email_verified: false,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (customer) {
    const token = v4();
    // 15 minutes from now (ISO 8601 string)
    const expires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
    await MyGlobal.prisma.shopping_mall_email_verifications.create({
      data: {
        id: v4(),
        user_id: customer.id,
        email,
        token,
        expires_at: expires,
        created_at: toISOStringSafe(new Date()),
        // No verified_at field to set now
      },
    });
  }
  // Always return empty object, never revealing anything about existence
  return {};
}
