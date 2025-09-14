import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update store banking details for a seller's store by banking record ID
 * (ai_commerce_store_banking).
 *
 * This endpoint allows a seller to update the banking (payout) configuration
 * for their own store. Only the store owner may update the banking data;
 * sensitive field updates may cause a compliance re-verification flow. All
 * changes are logged externally for audit.
 *
 * @param props - Input parameters for this operation
 * @param props.seller - Authenticated seller (payload)
 * @param props.storeBankingId - Unique identifier for the store banking record
 *   to update
 * @param props.body - Banking update information (partial fields to update)
 * @returns The updated IAiCommerceStoreBanking record
 * @throws {Error} When the record does not exist, the store does not exist, or
 *   the store is not owned by the requesting seller
 */
export async function putaiCommerceSellerStoreBankingStoreBankingId(props: {
  seller: SellerPayload;
  storeBankingId: string & tags.Format<"uuid">;
  body: IAiCommerceStoreBanking.IUpdate;
}): Promise<IAiCommerceStoreBanking> {
  // Fetch the banking record
  const banking = await MyGlobal.prisma.ai_commerce_store_banking.findUnique({
    where: { id: props.storeBankingId },
  });
  if (!banking) throw new Error("Store banking record not found");
  // Fetch the store and verify ownership
  const store = await MyGlobal.prisma.ai_commerce_stores.findUnique({
    where: { id: banking.store_id },
  });
  if (!store) throw new Error("Store not found");
  if (store.owner_user_id !== props.seller.id) {
    throw new Error(
      "Forbidden: Only the store owner can update their banking information",
    );
  }
  // Determine if sensitive fields are being updated
  const sensitiveFieldChanged =
    props.body.bank_name !== undefined ||
    props.body.account_number !== undefined ||
    props.body.account_holder_name !== undefined ||
    props.body.routing_code !== undefined;
  // If seller provides verified, respect it. Otherwise, reset to false on sensitive changes
  const verified =
    props.body.verified !== undefined
      ? props.body.verified
      : sensitiveFieldChanged
        ? false
        : banking.verified;
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_store_banking.update({
    where: { id: props.storeBankingId },
    data: {
      bank_name: props.body.bank_name ?? undefined,
      account_number: props.body.account_number ?? undefined,
      account_holder_name: props.body.account_holder_name ?? undefined,
      routing_code: props.body.routing_code ?? undefined,
      banking_metadata: props.body.banking_metadata ?? undefined,
      verified,
      updated_at: now,
    },
  });
  // Assemble result with correct type conversions
  return {
    id: updated.id,
    store_id: updated.store_id,
    bank_name: updated.bank_name,
    account_number: updated.account_number,
    account_holder_name: updated.account_holder_name,
    routing_code: updated.routing_code ?? undefined,
    banking_metadata: updated.banking_metadata ?? undefined,
    verified: updated.verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
