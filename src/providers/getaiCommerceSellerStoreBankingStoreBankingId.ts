import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve seller store banking details by banking record ID
 * (ai_commerce_store_banking).
 *
 * Fetches detailed store banking information for a seller's own store by
 * banking record ID. This function validates that the authenticated seller is
 * the owner of the store linked to the banking record. Both the banking record
 * and the store must not be soft-deleted.
 *
 * @param props - seller: The authenticated seller (ai_commerce_buyer.id as id
 *   property) storeBankingId: The UUID bank record to retrieve
 * @returns The detailed banking information mapped to IAiCommerceStoreBanking
 * @throws {Error} If the banking record does not exist or is soft-deleted, or
 *   if the requesting seller does not own the corresponding store.
 */
export async function getaiCommerceSellerStoreBankingStoreBankingId(props: {
  seller: SellerPayload;
  storeBankingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStoreBanking> {
  const banking = await MyGlobal.prisma.ai_commerce_store_banking.findFirst({
    where: {
      id: props.storeBankingId,
      deleted_at: null,
    },
  });
  if (!banking) {
    throw new Error("Store banking record not found or has been deleted.");
  }
  const store = await MyGlobal.prisma.ai_commerce_stores.findFirst({
    where: {
      id: banking.store_id,
      owner_user_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!store) {
    throw new Error(
      "Forbidden: You do not have access to this store banking record.",
    );
  }
  return {
    id: banking.id,
    store_id: banking.store_id,
    bank_name: banking.bank_name,
    account_number: banking.account_number,
    account_holder_name: banking.account_holder_name,
    routing_code:
      typeof banking.routing_code === "string"
        ? banking.routing_code
        : undefined,
    banking_metadata:
      typeof banking.banking_metadata === "string"
        ? banking.banking_metadata
        : undefined,
    verified: banking.verified,
    created_at: toISOStringSafe(banking.created_at),
    updated_at: toISOStringSafe(banking.updated_at),
    deleted_at: banking.deleted_at
      ? toISOStringSafe(banking.deleted_at)
      : undefined,
  };
}
