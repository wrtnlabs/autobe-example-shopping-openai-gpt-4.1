import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a deposit account by its unique identifier (UUID) in aiCommerce's
 * deposit account table.
 *
 * This endpoint allows an authenticated admin to update the status or currency
 * code of an existing deposit account. Only 'active' or 'suspended' are valid
 * for status; business constraints and audit compliance are enforced. If the
 * account does not exist or has been soft-deleted, an error is thrown. All
 * datetime fields are returned as branded ISO8601 strings.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update (must have
 *   platform admin rights)
 * @param props.depositAccountId - The UUID of the deposit account to update
 * @param props.body - Update information; may include status
 *   ('active'/'suspended') and/or currency_code
 * @returns The updated deposit account's complete information
 * @throws {Error} When the account does not exist, has been deleted, or status
 *   is invalid
 */
export async function putaiCommerceAdminDepositAccountsDepositAccountId(props: {
  admin: AdminPayload;
  depositAccountId: string & tags.Format<"uuid">;
  body: IAiCommerceDepositAccount.IUpdate;
}): Promise<IAiCommerceDepositAccount> {
  const { admin, depositAccountId, body } = props;
  // Step 1: Fetch the deposit account, ensuring it's not soft-deleted
  const account = await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
    where: {
      id: depositAccountId,
      deleted_at: null,
    },
  });
  if (!account) {
    throw new Error("Deposit account not found or already deleted");
  }
  // Step 2: Validate status (if present)
  if (
    body.status !== undefined &&
    body.status !== "active" &&
    body.status !== "suspended"
  ) {
    throw new Error("Invalid status value: must be 'active' or 'suspended'");
  }
  // Step 3: Prepare update fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_deposit_accounts.update({
    where: { id: depositAccountId },
    data: {
      status: body.status === undefined ? undefined : body.status,
      currency_code:
        body.currency_code === undefined ? undefined : body.currency_code,
      updated_at: now,
    },
  });
  // Step 4: Build response, converting all datetime fields
  return {
    id: updated.id,
    account_code: updated.account_code,
    user_id: updated.user_id,
    balance: updated.balance,
    currency_code: updated.currency_code,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
