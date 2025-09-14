import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete (logical removal) of an aiCommerce sales channel by UUID (admin
 * only).
 *
 * Marks the specified aiCommerce sales channel as deleted by setting its
 * deleted_at column. Only platform admins may perform channel deletion; all
 * actions are fully logged via soft-delete for compliance. Attempts to remove a
 * non-existing or already deleted channel throw a business error.
 *
 * @param props - Arguments for channel removal
 * @param props.admin - The authenticated administrator payload (authenticated
 *   by AdminAuth)
 * @param props.channelId - Unique identifier (UUID) of the aiCommerce sales
 *   channel to be soft-deleted
 * @returns Nothing (void)
 * @throws {Error} If the channel does not exist or is already deleted
 */
export async function deleteaiCommerceAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { channelId } = props;
  // Find the channel only if not already soft-deleted
  const channel = await MyGlobal.prisma.ai_commerce_channels.findFirst({
    where: {
      id: channelId,
      deleted_at: null,
    },
  });
  if (!channel) {
    throw new Error("Channel not found or already deleted");
  }
  // Mark as soft-deleted by setting deleted_at to the current timestamp (ISO string)
  await MyGlobal.prisma.ai_commerce_channels.update({
    where: { id: channelId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No value to return; null/void.
  return;
}
