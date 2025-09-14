import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Show a specific deposit account record by its ID (admin only)
 *
 * Retrieves full detailed data for a specific deposit account from
 * ai_commerce_deposit_accounts by its unique ID. This endpoint is accessible
 * only by admin users (enforced by AdminPayload) and exposes business-critical
 * information like balance, status, identifiers, and user linkage after
 * validating the record is active (non-deleted).
 *
 * If no matching account is found (including deleted accounts), throws an error
 * (404 semantics). Audit, compliance, and sensitive exposure rules are enforced
 * by authentication and field mapping. Returns all main business fields defined
 * in IAiCommerceDepositAccount, with all date fields in ISO 8601 string format
 * and strict type matching.
 *
 * @param props - Admin: Authenticated AdminPayload (role-checked),
 *   depositAccountId: Unique account UUID parameter
 * @returns Comprehensive deposit account record matching
 *   IAiCommerceDepositAccount
 * @throws {Error} When deposit account not found or is deleted
 */
export async function getaiCommerceAdminDepositAccountsDepositAccountId(props: {
  admin: AdminPayload;
  depositAccountId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceDepositAccount> {
  const { depositAccountId } = props;
  const account = await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
    where: { id: depositAccountId, deleted_at: null },
  });
  if (!account) throw new Error("Deposit account not found");
  return {
    id: account.id,
    account_code: account.account_code,
    user_id: account.user_id,
    balance: account.balance,
    currency_code: account.currency_code,
    status: account.status,
    created_at: toISOStringSafe(account.created_at),
    updated_at: toISOStringSafe(account.updated_at),
    deleted_at: account.deleted_at
      ? toISOStringSafe(account.deleted_at)
      : undefined,
  };
}
