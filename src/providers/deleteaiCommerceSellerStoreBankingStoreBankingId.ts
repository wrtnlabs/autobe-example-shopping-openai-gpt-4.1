import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently (soft) deletes a banking configuration record for a seller's
 * store (ai_commerce_store_banking) by its unique ID.
 *
 * - Performs a soft delete by updating deleted_at to the current timestamp
 *   (physical removal not allowed if deleted_at exists).
 * - Only the store's authorized owner (seller) can perform this operation;
 *   attempts by other users are rejected.
 * - Throws errors on not found or unauthorized cases.
 * - All timestamps use string & tags.Format<'date-time'> and UUIDs are handled as
 *   required.
 *
 * @param props Object containing seller (authenticated SellerPayload) and
 *   storeBankingId (uuid for the banking record)
 * @param props.seller Authenticated seller payload
 * @param props.storeBankingId Unique uuid identifier of the store banking
 *   record to delete
 * @returns Void
 * @throws {Error} If not found, already deleted, or unauthorized
 */
export async function deleteaiCommerceSellerStoreBankingStoreBankingId(props: {
  seller: SellerPayload;
  storeBankingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, storeBankingId } = props;

  // Step 1: Look up the banking record that's NOT deleted
  const banking = await MyGlobal.prisma.ai_commerce_store_banking.findFirst({
    where: {
      id: storeBankingId,
      deleted_at: null,
    },
  });
  if (!banking) {
    throw new Error("Store banking record not found or already deleted");
  }

  // Step 2: Check store ownership
  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: {
      id: banking.store_id,
      deleted_at: null,
    },
  });
  if (!store || store.owner_user_id !== seller.id) {
    throw new Error(
      "You are not authorized to delete this store banking record",
    );
  }

  // Step 3: Soft delete (set deleted_at to now as string & tags.Format<'date-time'>)
  await MyGlobal.prisma.ai_commerce_store_banking.update({
    where: { id: storeBankingId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // TODO: Add audit logging as required by compliance; not defined here
}
