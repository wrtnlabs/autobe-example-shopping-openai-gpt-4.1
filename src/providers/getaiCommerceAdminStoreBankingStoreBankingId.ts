import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve seller store banking details by banking record ID
 * (ai_commerce_store_banking).
 *
 * Fetches detailed banking/payout account information for a seller's store
 * using its unique banking record ID. The result includes legal account
 * details, verification/compliance status, and audit timestamps. Authenticated
 * admin users are permitted, and access is strictly enforced by authentication
 * decorator. Sensitive details are made visible for permitted roles. Throws
 * error if not found.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated admin performing the request
 * @param props.storeBankingId - The unique banking record ID to retrieve
 * @returns Complete banking information for the specified store
 * @throws {Error} If the banking record with the given ID does not exist
 */
export async function getaiCommerceAdminStoreBankingStoreBankingId(props: {
  admin: AdminPayload;
  storeBankingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStoreBanking> {
  const raw = await MyGlobal.prisma.ai_commerce_store_banking.findUniqueOrThrow(
    {
      where: { id: props.storeBankingId },
      select: {
        id: true,
        store_id: true,
        bank_name: true,
        account_number: true,
        account_holder_name: true,
        routing_code: true,
        banking_metadata: true,
        verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    id: raw.id,
    store_id: raw.store_id,
    bank_name: raw.bank_name,
    account_number: raw.account_number,
    account_holder_name: raw.account_holder_name,
    routing_code: raw.routing_code ?? null,
    banking_metadata: raw.banking_metadata ?? null,
    verified: raw.verified,
    created_at: toISOStringSafe(raw.created_at),
    updated_at: toISOStringSafe(raw.updated_at),
    deleted_at: raw.deleted_at != null ? toISOStringSafe(raw.deleted_at) : null,
  };
}
