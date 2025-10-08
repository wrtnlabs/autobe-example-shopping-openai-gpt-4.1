import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerEmailVerify(props: {
  body: IShoppingMallCustomer.IVerifyEmail;
}): Promise<IShoppingMallCustomer.IEmailVerificationResult> {
  // Step 1: Attempt to find the verification record by token
  const verification =
    await MyGlobal.prisma.shopping_mall_email_verifications.findUnique({
      where: { token: props.body.token },
    });

  // Step 2: If token not found or expired, return generic failure (never leak existence/category)
  if (!verification || verification.expires_at <= new Date()) {
    return {
      success: false,
      message: "토큰이 올바르지 않거나 만료되었습니다.",
    };
  }

  // Step 3: Set customer's email_verified = true
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: verification.user_id },
    data: { email_verified: true },
  });

  // Step 4: Remove the verification record (hard delete)
  await MyGlobal.prisma.shopping_mall_email_verifications.delete({
    where: { token: props.body.token },
  });

  // Step 5: Return generic success (for security, never leak more)
  return {
    success: true,
    message: "이메일 인증이 완료되었습니다.",
  };
}
