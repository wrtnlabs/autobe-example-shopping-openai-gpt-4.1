import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve detailed information for a specific mileage account by its unique
 * identifier.
 *
 * This function fetches the mileage account record from the
 * ai_commerce_mileage_accounts table based on the provided UUID, strictly
 * verifies seller ownership, and exposes all business, audit, and compliance
 * fields as specified by the IAiCommerceMileageAccount contract. All
 * date/datetime fields are returned as ISO 8601 UTC branded strings, and
 * deleted_at follows the contract by defaulting to undefined if not present in
 * the database. Seller must match the user_id of the mileage account or access
 * is denied.
 *
 * @param props - Object containing the authenticated seller and the unique
 *   identifier for the account
 * @param props.seller - The authenticated SellerPayload corresponding to a
 *   seller's ai_commerce_buyer.id
 * @param props.mileageAccountId - Unique identifier for the mileage account to
 *   fetch
 * @returns IAiCommerceMileageAccount - A fully populated account including all
 *   audit/status fields
 * @throws {Error} If the mileage account does not exist or seller is not owner
 *   of the account
 */
export async function getaiCommerceSellerMileageAccountsMileageAccountId(props: {
  seller: SellerPayload;
  mileageAccountId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceMileageAccount> {
  const { seller, mileageAccountId } = props;
  const record = await MyGlobal.prisma.ai_commerce_mileage_accounts.findUnique({
    where: { id: mileageAccountId },
  });
  if (!record) {
    throw new Error("Mileage account not found");
  }
  if (record.user_id !== seller.id) {
    throw new Error(
      "Unauthorized: Only the account owner may access this account",
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
