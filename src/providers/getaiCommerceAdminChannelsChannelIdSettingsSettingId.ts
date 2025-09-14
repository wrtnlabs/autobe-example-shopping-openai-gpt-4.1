import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific aiCommerce channel setting (admin only).
 *
 * This operation fetches comprehensive metadata for a configuration setting
 * belonging to a specific sales channel, identified by both channelId and
 * settingId (UUIDs). The response includes the key, value, audit timestamps,
 * and linkage to the parent channel. Access is restricted to admin accounts for
 * security, compliance, and auditability.
 *
 * @param props - Parameter object
 * @param props.admin - Authenticated admin payload (enforced by middleware)
 * @param props.channelId - UUID of the parent aiCommerce channel
 * @param props.settingId - UUID of the configuration setting to retrieve
 * @returns Metadata for the specific channel setting, per
 *   IAiCommerceChannelSetting schema
 * @throws {Error} If the setting does not exist for the given channel, or is
 *   inaccessible
 */
export async function getaiCommerceAdminChannelsChannelIdSettingsSettingId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  settingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceChannelSetting> {
  const found = await MyGlobal.prisma.ai_commerce_channel_settings.findFirst({
    where: {
      id: props.settingId,
      ai_commerce_channel_id: props.channelId,
    },
  });
  if (!found) {
    throw new Error("Channel setting not found");
  }
  return {
    id: found.id,
    ai_commerce_channel_id: found.ai_commerce_channel_id,
    key: found.key,
    value: found.value,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at:
      found.deleted_at != null ? toISOStringSafe(found.deleted_at) : undefined,
  };
}
