import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update store banking details for a seller’s store by banking record ID
 * (ai_commerce_store_banking).
 *
 * This operation updates an existing store banking record with new account
 * details, bank information, routing, and compliance metadata. Only
 * administrators or store owners can perform this update. The banking record
 * must not be soft-deleted.
 *
 * @param props - Input object containing:
 *
 *   - Admin: Authenticated admin payload (authorization handled by decorator)
 *   - StoreBankingId: Unique banking record UUID to update
 *   - Body: Partial record of updatable fields and their values (bank_name,
 *       account_number, etc)
 *
 * @returns The updated store banking information matching
 *   IAiCommerceStoreBanking
 * @throws {Error} If the banking record does not exist or is deleted
 */
export async function putaiCommerceAdminStoreBankingStoreBankingId(props: {
  admin: AdminPayload;
  storeBankingId: string & tags.Format<"uuid">;
  body: IAiCommerceStoreBanking.IUpdate;
}): Promise<IAiCommerceStoreBanking> {
  const { storeBankingId, body } = props;

  // Find the current (active) banking record by ID
  const existing = await MyGlobal.prisma.ai_commerce_store_banking.findFirst({
    where: { id: storeBankingId, deleted_at: null },
  });
  if (!existing) {
    throw new Error("Store banking record not found or has been deleted");
  }

  // Prepare update data (only allowed fields, ensure correct nullable/optional logic)
  const result = await MyGlobal.prisma.ai_commerce_store_banking.update({
    where: { id: storeBankingId },
    data: {
      bank_name: body.bank_name ?? undefined,
      account_number: body.account_number ?? undefined,
      account_holder_name: body.account_holder_name ?? undefined,
      routing_code:
        body.routing_code !== undefined ? body.routing_code : undefined,
      banking_metadata:
        body.banking_metadata !== undefined ? body.banking_metadata : undefined,
      verified: body.verified ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return object - map DB record to IAiCommerceStoreBanking structure and types
  return {
    id: result.id,
    store_id: result.store_id,
    bank_name: result.bank_name,
    account_number: result.account_number,
    account_holder_name: result.account_holder_name,
    routing_code: result.routing_code ?? undefined,
    banking_metadata: result.banking_metadata ?? undefined,
    verified: result.verified,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at !== null && result.deleted_at !== undefined
        ? toISOStringSafe(result.deleted_at)
        : undefined,
  };
}
