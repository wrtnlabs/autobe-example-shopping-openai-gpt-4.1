import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannelSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannelSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new configuration setting for a channel (admin only).
 *
 * This operation creates a new configuration setting (key/value) for a specific
 * aiCommerce channel, as recorded in ai_commerce_channel_settings. It ensures
 * only administrators are authorized, and enforces that no duplicate setting
 * key can be registered for the same channel (unique on
 * [ai_commerce_channel_id, key]).
 *
 * Upon success, returns the complete newly persisted setting record.
 *
 * @param props - The props object
 * @param props.admin - The authorized admin user making the request
 * @param props.channelId - The unique identifier of the channel
 * @param props.body - The request body containing {key, value} for the new
 *   setting
 * @returns The full, persisted configuration setting for the channel
 * @throws {Error} If a setting with the same key already exists for the given
 *   channel
 */
export async function postaiCommerceAdminChannelsChannelIdSettings(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceChannelSetting.ICreate;
}): Promise<IAiCommerceChannelSetting> {
  // Uniqueness check for key on this channel
  const duplicate =
    await MyGlobal.prisma.ai_commerce_channel_settings.findFirst({
      where: {
        ai_commerce_channel_id: props.channelId,
        key: props.body.key,
        deleted_at: null,
      },
    });
  if (duplicate !== null) {
    throw new Error(
      "Duplicate key for this channel: a setting with this key already exists",
    );
  }
  // Prepare fields
  const settingId = v4();
  const now = toISOStringSafe(new Date());
  // Persist new setting
  const created = await MyGlobal.prisma.ai_commerce_channel_settings.create({
    data: {
      id: settingId,
      ai_commerce_channel_id: props.channelId,
      key: props.body.key,
      value: props.body.value,
      created_at: now,
      updated_at: now,
      // Soft delete field omitted: null by default
    },
  });
  // Map persisted row to DTO intensional type
  return {
    id: created.id,
    ai_commerce_channel_id: created.ai_commerce_channel_id,
    key: created.key,
    value: created.value,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    // deleted_at field: optional/null/undefined per DTO/DB
    ...(created.deleted_at !== undefined && created.deleted_at !== null
      ? { deleted_at: toISOStringSafe(created.deleted_at) }
      : {}),
  };
}
