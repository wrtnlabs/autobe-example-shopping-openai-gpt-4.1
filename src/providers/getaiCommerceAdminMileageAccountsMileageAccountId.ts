import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a specific mileage account by its unique
 * identifier.
 *
 * Allows an authenticated administrator to view all business fields and
 * audit/compliance information for any mileage account, including soft-deleted
 * ones. Throws an error if no account exists with the specified ID.
 *
 * @param props - Object containing admin authentication and mileageAccountId to
 *   query
 * @param props.admin - The authenticated admin requesting the detail view
 * @param props.mileageAccountId - The UUID of the mileage account to retrieve
 * @returns IAiCommerceMileageAccount - All field values as of the account in
 *   the database
 * @throws {Error} If no mileage account with the given ID exists in the
 *   database
 */
export async function getaiCommerceAdminMileageAccountsMileageAccountId(props: {
  admin: AdminPayload;
  mileageAccountId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageAccount> {
  const { mileageAccountId } = props;
  const record = await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
    where: { id: mileageAccountId },
  });
  if (!record) throw new Error("Mileage account not found");
  return {
    id: record.id,
    account_code: record.account_code,
    user_id: record.user_id,
    balance: record.balance,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
