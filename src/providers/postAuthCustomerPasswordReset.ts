import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerPasswordReset(props: {
  body: IShoppingMallCustomer.IResetPassword;
}): Promise<IShoppingMallCustomer.IPasswordResetResult> {
  const { token, newPassword } = props.body;
  const now = toISOStringSafe(new Date());

  try {
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
      // Step 1: Lookup reset token
      const resetRecord = await tx.shopping_mall_password_resets.findUnique({
        where: { token },
        select: { token: true, expires_at: true, used_at: true, user_id: true },
      });
      if (!resetRecord) {
        return { success: false, errorCode: "invalid_token" };
      }

      // Convert expires_at and used_at to ISO string for safe handling
      const expiresAt = toISOStringSafe(resetRecord.expires_at);
      const usedAt = resetRecord.used_at
        ? toISOStringSafe(resetRecord.used_at)
        : null;

      // Compare times (use JS Date logic internally, never expose type)
      if (
        // Already used
        usedAt !== null ||
        // Expired: expiresAt < now
        Date.parse(expiresAt) < Date.parse(now)
      ) {
        return { success: false, errorCode: "invalid_token" };
      }

      // Step 2: Find customer by user_id
      const user = await tx.shopping_mall_customers.findUnique({
        where: { id: resetRecord.user_id },
        select: { id: true },
      });
      if (!user) {
        return { success: false, errorCode: "invalid_token" };
      }

      // Step 3: Hash new password
      const hashed = await PasswordUtil.hash(newPassword);
      await tx.shopping_mall_customers.update({
        where: { id: user.id },
        data: { password_hash: hashed },
      });

      // Step 4: Mark token as used (now)
      await tx.shopping_mall_password_resets.update({
        where: { token },
        data: { used_at: now },
      });

      // Step 5: Delete all user sessions
      await tx.shopping_mall_user_sessions.deleteMany({
        where: { user_id: user.id },
      });

      return { success: true };
    });
    return result;
  } catch {
    return { success: false, errorCode: "internal_error" };
  }
}
