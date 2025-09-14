import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing channel configuration setting
 * (ai_commerce_channel_settings).
 *
 * This endpoint allows an administrator to update the configuration key and/or
 * value for a specific channel setting row identified by settingId, scoped to
 * the provided channelId. Only admin-authenticated users may perform this
 * action. All updates are automatically audited and enforce channel ownership
 * and logical deletion checks.
 *
 * - Only fields provided in the request body (key, value) will be updated;
 *   omitted fields will remain unchanged.
 * - The update is performed only if the setting belongs to the specified channel
 *   and is not soft-deleted (deleted_at: null).
 * - All date fields are normalized as ISO 8601 strings.
 *
 * @param props - The operation parameters
 * @param props.admin - Authenticated admin user context
 * @param props.channelId - UUID of the target channel to which this setting
 *   belongs
 * @param props.settingId - UUID of the setting row to update
 * @param props.body - Updates to apply (key? value?)
 * @returns The updated channel setting entity
 * @throws {Error} If the setting does not exist, does not belong to the
 *   channel, or is logically deleted
 */
export async function putaiCommerceAdminChannelsChannelIdSettingsSettingId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  settingId: string & tags.Format<"uuid">;
  body: IAiCommerceChannelSetting.IUpdate;
}): Promise<IAiCommerceChannelSetting> {
  // Prepare current timestamp for update
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Attempt update on setting with correct channel ownership and undeleted
  const updated = await MyGlobal.prisma.ai_commerce_channel_settings.update({
    where: {
      // Composite unique WHERE: (id + channel FK + undeleted)
      id: props.settingId,
      ai_commerce_channel_id: props.channelId,
      deleted_at: null,
    },
    data: {
      // Only update provided fields (allow partial update)
      key: props.body.key ?? undefined,
      value: props.body.value ?? undefined,
      updated_at: now,
    },
    select: {
      id: true,
      ai_commerce_channel_id: true,
      key: true,
      value: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return entity with all fields serialized appropriately
  return {
    id: updated.id,
    ai_commerce_channel_id: updated.ai_commerce_channel_id,
    key: updated.key,
    value: updated.value,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
