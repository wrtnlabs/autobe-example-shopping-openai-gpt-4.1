import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a store setting by ID (ai_commerce_store_settings).
 *
 * This operation allows an authenticated admin to update the JSON configuration
 * or active status of an existing store setting record, identified by its
 * unique UUID. Only 'settings_json' and 'active' fields may be modified. The
 * change will be recorded in the audit trail according to platform policies.
 * Updates are forbidden if the setting is soft-deleted. All date/datetime
 * fields are formatted as ISO 8601 strings.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated admin performing the operation
 *   - StoreSettingId: UUID of the store setting record to update
 *   - Body: Partial update data (settings_json and/or active), conforming to
 *       IAiCommerceStoreSetting.IUpdate
 *
 * @returns The updated, fully populated store setting record
 *   (IAiCommerceStoreSetting)
 * @throws {Error} When the record does not exist or has already been deleted
 */
export async function putaiCommerceAdminStoreSettingsStoreSettingId(props: {
  admin: AdminPayload;
  storeSettingId: string & tags.Format<"uuid">;
  body: IAiCommerceStoreSetting.IUpdate;
}): Promise<IAiCommerceStoreSetting> {
  const { storeSettingId, body } = props;

  // Step 1: Fetch existing record, verify not deleted
  const existing = await MyGlobal.prisma.ai_commerce_store_settings.findFirst({
    where: { id: storeSettingId, deleted_at: null },
  });
  if (!existing) {
    throw new Error("Store setting not found or already deleted");
  }

  // Step 2: Update only provided fields (settings_json, active)
  const updated = await MyGlobal.prisma.ai_commerce_store_settings.update({
    where: { id: storeSettingId },
    data: {
      settings_json: body.settings_json ?? undefined,
      active: body.active ?? undefined,
    },
  });

  // Step 3: Convert date fields and return updated record
  const result: IAiCommerceStoreSetting = {
    id: updated.id,
    store_id: updated.store_id,
    settings_json: updated.settings_json,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
  return result;
}
