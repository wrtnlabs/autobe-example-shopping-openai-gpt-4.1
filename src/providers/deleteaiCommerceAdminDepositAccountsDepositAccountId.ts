import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete a deposit account by UUID, with strict audit requirements for
 * compliance.
 *
 * Logically removes (soft-deletes) an ai_commerce_deposit_accounts row by
 * setting deleted_at, never physically deletes (always retained for financial
 * compliance/audit).
 *
 * Only admins can invoke; attempts to delete a non-existent or already deleted
 * account will throw. All such actions are expected to be captured in a system
 * audit trail (at DB or elsewhere).
 *
 * @param props - Operation parameters: authenticated admin, and the
 *   depositAccountId to soft-delete
 * @param props.admin - The authenticated system administrator performing the
 *   action
 * @param props.depositAccountId - The UUID of the deposit account to
 *   soft-delete
 * @returns Void
 * @throws {Error} If the deposit account does not exist or is already
 *   soft-deleted
 */
export async function deleteaiCommerceAdminDepositAccountsDepositAccountId(props: {
  admin: AdminPayload;
  depositAccountId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Enforce row existence and prevent double-delete
  const account = await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
    where: {
      id: props.depositAccountId,
      deleted_at: null,
    },
  });
  if (!account) {
    throw new Error("Deposit account not found or already deleted");
  }
  await MyGlobal.prisma.ai_commerce_deposit_accounts.update({
    where: { id: props.depositAccountId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
