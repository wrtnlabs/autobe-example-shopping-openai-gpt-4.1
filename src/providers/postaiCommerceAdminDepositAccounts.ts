import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new user (buyer or seller) deposit account administratively (admin
 * only).
 *
 * This operation enables an admin to create a deposit/e-wallet account for an
 * arbitrary user (buyer or seller) given all required parameters. Manual
 * creation through this endpoint should only be used for compliance/exception
 * workflows; regular creation is system-triggered at registration. Account must
 * have a unique account_code and is directly linked to the specified user (via
 * user_id).
 *
 * Security: Only system administrators (admin role) can use this endpoint. All
 * field values must be validated upstream, and result is audited for
 * compliance. This operation must not be exposed to end users.
 *
 * @param props - The request wrapper object.
 * @param props.admin - The authenticated AdminPayload representing an active
 *   admin (required for authorization).
 * @param props.body - The deposit account creation input. Must provide:
 *   user_id, account_code, balance, currency_code, status.
 * @returns The fully populated IAiCommerceDepositAccount for the new deposit
 *   account row (including id and timestamps).
 * @throws {Error} If a duplicate account_code is used, the user_id is invalid,
 *   or any DB constraint fails.
 */
export async function postaiCommerceAdminDepositAccounts(props: {
  admin: AdminPayload;
  body: IAiCommerceDepositAccount.ICreate;
}): Promise<IAiCommerceDepositAccount> {
  // Prepare timestamp and UUID using approved utilities.
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.ai_commerce_deposit_accounts.create({
      data: {
        id,
        user_id: props.body.user_id,
        account_code: props.body.account_code,
        balance: props.body.balance,
        currency_code: props.body.currency_code,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    // Prisma returns string for all fields except date-time, which must be properly branded.
    return {
      id: created.id,
      user_id: created.user_id,
      account_code: created.account_code,
      balance: created.balance,
      currency_code: created.currency_code,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== undefined && created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (error) {
    // Duplicate account_code or FK/user constraint errors will propagate.
    throw error;
  }
}
