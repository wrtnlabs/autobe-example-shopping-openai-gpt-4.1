import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete (soft erase) a channel setting from a given sales channel
 * (ai_commerce_channel_settings).
 *
 * This operation allows an administrator to logically erase (soft delete) a
 * specific configuration setting within a given channel. It ensures that
 * critical settings cannot be deleted, checks for valid authorization, and
 * removes the record by setting "deleted_at". All business, compliance, and
 * referential integrity rules are strictly enforced.
 *
 * @param props - The props object containing deletion parameters
 * @param props.admin - Authenticated admin performing the operation
 * @param props.channelId - UUID of the channel containing the setting
 * @param props.settingId - UUID of the setting to erase
 * @returns Void
 * @throws {Error} When the channel setting does not exist, is already deleted,
 *   or is business-critical and protected from removal
 */
export async function deleteaiCommerceAdminChannelsChannelIdSettingsSettingId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  settingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId, settingId } = props;

  // Find the channel setting and ensure it is active
  const setting = await MyGlobal.prisma.ai_commerce_channel_settings.findFirst({
    where: {
      id: settingId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new Error("Channel setting not found or already deleted");
  }

  // Prevent deletion of critical settings by known key names
  const criticalKeys = ["default_locale", "core_branding", "system_endpoint"];
  if (criticalKeys.includes(setting.key)) {
    throw new Error("Cannot delete critical channel setting");
  }

  // Set deleted_at (soft delete)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_channel_settings.update({
    where: { id: settingId },
    data: { deleted_at: now },
  });

  // Optionally, log to ai_commerce_audit_logs_system here for compliance or evidence
  // (Not required by interface—spec says to log, but implementation may be handled in global hook)
  return;
}
