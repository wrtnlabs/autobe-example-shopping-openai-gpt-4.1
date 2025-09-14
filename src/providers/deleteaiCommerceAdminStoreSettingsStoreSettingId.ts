import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete (hard) a store setting by ID (ai_commerce_store_settings).
 *
 * This operation permanently deletes a store setting record from the database
 * by unique storeSettingId. Only system administrators can perform this
 * operation. All deletions of store settings are subject to business
 * safeguards: deleting an 'active' setting is forbidden to avoid dangerous
 * misconfiguration.
 *
 * No audit log table exists in the current schema for
 * ai_commerce_store_settings deletions. If/when an audit table is available,
 * this logic should be amended to create a deletion audit entry for compliance
 * purposes.
 *
 * @param props - The request properties
 * @param props.admin - The authenticated AdminPayload performing the operation
 * @param props.storeSettingId - The UUID of the store setting to delete
 * @returns Void (on success)
 * @throws {Error} If the store setting does not exist, is already deleted, or
 *   is currently active
 */
export async function deleteaiCommerceAdminStoreSettingsStoreSettingId(props: {
  admin: AdminPayload;
  storeSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { storeSettingId } = props;

  // 1. Fetch the store setting by primary key
  const storeSetting =
    await MyGlobal.prisma.ai_commerce_store_settings.findUnique({
      where: { id: storeSettingId },
    });
  if (!storeSetting) {
    throw new Error("Store setting not found or already deleted.");
  }

  // 2. Disallow deletion of an active setting
  if (storeSetting.active) {
    throw new Error(
      "Cannot delete an active store setting. Please deactivate it before deletion.",
    );
  }

  // 3. Perform hard deletion (permanent removal)
  await MyGlobal.prisma.ai_commerce_store_settings.delete({
    where: { id: storeSettingId },
  });

  // 4. Audit logging - no table for store_settings deletion in schema, skip for now
}
