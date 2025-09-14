import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a store banking record by banking record ID
 * (ai_commerce_store_banking).
 *
 * This operation allows an admin to irreversibly delete a store's banking
 * information from the platform. The record will be physically removed from the
 * ai_commerce_store_banking table, unless platform/business policies require
 * otherwise. All deletes are strictly audit-logged for legal and compliance
 * retention.
 *
 * Only users with administrator privileges are permitted to perform this
 * operation. The action will be recorded in the seller audit log with a
 * snapshot of the deleted record.
 *
 * @param props - The operation context
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.storeBankingId - ID of the store banking record to permanently
 *   delete
 * @returns Void
 * @throws {Error} If the record does not exist or is already deleted
 */
export async function deleteaiCommerceAdminStoreBankingStoreBankingId(props: {
  admin: AdminPayload;
  storeBankingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, storeBankingId } = props;

  // Fetch the existing banking record (ensure not already soft-deleted)
  const storeBanking =
    await MyGlobal.prisma.ai_commerce_store_banking.findUnique({
      where: { id: storeBankingId },
    });
  if (!storeBanking) {
    throw new Error("Store banking record not found.");
  }

  // Prepare an audit log before deletion (capture full snapshot including nullable fields)
  const auditLogId = v4();
  const auditEventData = JSON.stringify({
    id: storeBanking.id,
    store_id: storeBanking.store_id,
    bank_name: storeBanking.bank_name,
    account_number: storeBanking.account_number,
    account_holder_name: storeBanking.account_holder_name,
    routing_code:
      storeBanking.routing_code === undefined
        ? null
        : storeBanking.routing_code,
    banking_metadata:
      storeBanking.banking_metadata === undefined
        ? null
        : storeBanking.banking_metadata,
    verified: storeBanking.verified,
    created_at: toISOStringSafe(storeBanking.created_at),
    updated_at: toISOStringSafe(storeBanking.updated_at),
    deleted_at: storeBanking.deleted_at
      ? toISOStringSafe(storeBanking.deleted_at)
      : null,
  });

  // Delete the store banking record (hard delete)
  await MyGlobal.prisma.ai_commerce_store_banking.delete({
    where: { id: storeBankingId },
  });

  // Write the audit log
  await MyGlobal.prisma.ai_commerce_audit_logs_seller.create({
    data: {
      id: auditLogId,
      seller_profile_id: null,
      event_type: "delete_store_banking",
      event_data: auditEventData,
      actor: admin.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
