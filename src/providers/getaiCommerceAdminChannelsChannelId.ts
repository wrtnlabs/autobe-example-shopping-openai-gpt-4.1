import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for a specific aiCommerce sales channel (admin only)
 *
 * This operation returns the full configuration and status details of a
 * specific aiCommerce sales channel given its unique identifier. Access is
 * restricted to admin users for compliance and auditability. The returned data
 * exactly mirrors the stored channel in the ai_commerce_channels model,
 * excluding soft-deleted entries (deleted_at is null).
 *
 * @param props - Contains the authenticated admin and the UUID of the target
 *   sales channel
 * @param props.admin - The authenticated admin payload (must have type="admin"
 *   and be active)
 * @param props.channelId - The UUID of the ai_commerce_channel to retrieve
 * @returns Detailed IAiCommerceChannel object for the specified channel
 * @throws {Error} If no channel exists with the given ID or the channel is
 *   soft-deleted
 */
export async function getaiCommerceAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceChannel> {
  const { channelId } = props;

  // Query for channel where deleted_at is null (exclude soft-deleted channels)
  const channel = await MyGlobal.prisma.ai_commerce_channels.findFirst({
    where: {
      id: channelId,
      deleted_at: null,
    },
  });
  if (!channel) {
    throw new Error("Channel not found");
  }
  return {
    id: channel.id,
    code: channel.code,
    name: channel.name,
    locale: channel.locale,
    is_active: channel.is_active,
    business_status: channel.business_status,
    created_at: toISOStringSafe(channel.created_at),
    updated_at: toISOStringSafe(channel.updated_at),
    deleted_at:
      channel.deleted_at === null ? null : toISOStringSafe(channel.deleted_at),
  };
}
