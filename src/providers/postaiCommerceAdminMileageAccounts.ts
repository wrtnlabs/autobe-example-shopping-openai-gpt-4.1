import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new mileage account for a user (buyer or seller).
 *
 * This endpoint allows an authenticated admin to create a mileage account
 * record for a user (buyer or seller) in the ai_commerce_mileage_accounts
 * table. The account will be initialized with the specified account_code,
 * initial balance (defaults to 0), and account status (defaults to 'active') if
 * not provided. Each user may have only one active mileage account per unique
 * account_code; attempts to create a duplicate will throw an error. Timestamps
 * for creation and update are set to the current moment in ISO 8601 UTC
 * format.
 *
 * @param props - The operation properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - The request body, containing creation data for the
 *   mileage account
 * @returns The created mileage account, with all audit and status fields
 *   populated as per IAiCommerceMileageAccount
 * @throws {Error} If an account with the same user_id and account_code already
 *   exists, or on DB write error
 */
export async function postaiCommerceAdminMileageAccounts(props: {
  admin: AdminPayload;
  body: IAiCommerceMileageAccount.ICreate;
}): Promise<IAiCommerceMileageAccount> {
  const { admin, body } = props;

  // Check uniqueness: prevent duplicate mileage account per user/account_code
  {
    const existing =
      await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
        where: {
          user_id: body.user_id,
          account_code: body.account_code,
        },
        select: { id: true },
      });
    if (existing) {
      throw new Error(
        "A mileage account with this account_code already exists for this user.",
      );
    }
  }

  // Initialize field values
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const balance: number = typeof body.balance === "number" ? body.balance : 0;
  const status: string =
    typeof body.status === "string" ? body.status : "active";

  const created = await MyGlobal.prisma.ai_commerce_mileage_accounts.create({
    data: {
      id: id,
      account_code: body.account_code,
      user_id: body.user_id,
      balance: balance,
      status: status,
      created_at: now,
      updated_at: now,
      deleted_at: null, // Always active on creation
    },
  });

  return {
    id: created.id,
    account_code: created.account_code,
    user_id: created.user_id,
    balance: created.balance,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
