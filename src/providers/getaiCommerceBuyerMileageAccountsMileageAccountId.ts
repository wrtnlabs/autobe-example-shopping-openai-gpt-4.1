import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve detailed information for a specific mileage account by its unique
 * identifier.
 *
 * This function fetches the detailed record of a mileage account
 * (ai_commerce_mileage_accounts) using the provided mileageAccountId. The
 * account is only accessible by its owner (the authenticated buyer). It
 * includes all schema-defined fields: id, account_code, user_id, balance,
 * status, created_at, updated_at, and does not include non-schema compliance
 * fields like currency_code or audit/compliance indicators (not present in
 * schema).
 *
 * @param props - Object containing the required buyer payload for
 *   authentication/authorization and the mileage account ID
 *
 *   - Buyer: Authenticated buyer's information (must match user_id of the mileage
 *       account)
 *   - MileageAccountId: UUID of the mileage account to read
 *
 * @returns Detailed IAiCommerceMileageAccount object with all schema-defined
 *   fields
 * @throws {Error} If the account is not found or buyer is not the owner
 */
export async function getaiCommerceBuyerMileageAccountsMileageAccountId(props: {
  buyer: BuyerPayload;
  mileageAccountId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageAccount> {
  const { buyer, mileageAccountId } = props;
  const record = await MyGlobal.prisma.ai_commerce_mileage_accounts.findFirst({
    where: { id: mileageAccountId },
  });
  if (!record) {
    throw new Error("Mileage account not found");
  }
  if (record.user_id !== buyer.id) {
    throw new Error(
      "Unauthorized: You may only access your own mileage account",
    );
  }
  return {
    id: record.id,
    account_code: record.account_code,
    user_id: record.user_id,
    balance: record.balance,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
