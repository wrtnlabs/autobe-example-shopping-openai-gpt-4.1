import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a specific store setting
 * (ai_commerce_store_settings).
 *
 * This operation allows an authenticated admin to retrieve the complete record
 * of a store setting referenced by its unique storeSettingId. The endpoint is
 * intended for use in admin dashboards, compliance review, and configuration
 * debugging. Soft-deleted store settings (with non-null deleted_at) are never
 * returned. Permission enforcement is handled by access to the admin role.
 *
 * All returned date/time fields are formatted as ISO 8601 strings to ensure
 * type safety and serialization compliance. Deleted records will not be found
 * (deleted_at: null). Errors are thrown for not found.
 *
 * @param props - Request parameter object
 * @param props.admin - Authenticated admin payload, grants unrestricted access
 *   to any store setting
 * @param props.storeSettingId - Unique UUID identifying the store setting
 * @returns Detailed information about the store setting, with all required
 *   fields (including nullable deleted_at)
 * @throws {Error} When the record is not found or soft-deleted
 */
export async function getaiCommerceAdminStoreSettingsStoreSettingId(props: {
  admin: AdminPayload;
  storeSettingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStoreSetting> {
  const { storeSettingId } = props;
  const record = await MyGlobal.prisma.ai_commerce_store_settings.findFirst({
    where: {
      id: storeSettingId,
      deleted_at: null,
    },
  });
  if (!record) throw new Error("Store setting not found");
  return {
    id: record.id,
    store_id: record.store_id,
    settings_json: record.settings_json,
    active: record.active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
