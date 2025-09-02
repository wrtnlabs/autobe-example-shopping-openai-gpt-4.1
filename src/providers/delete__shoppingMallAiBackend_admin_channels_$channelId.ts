import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-deletes a sales channel by setting its deleted_at field.
 *
 * This operation logically deletes (soft-deletes) a sales channel using its
 * unique ID, marking it as removed in the system while preserving all records
 * for compliance and evidence. The sales channel is not physically removed from
 * the database; only the deleted_at field is set.
 *
 * Available only to authenticated administrator users.
 *
 * - If the channel does not exist, throws an Error.
 * - If the channel is already deleted (deleted_at is set), the operation is
 *   idempotent.
 *
 * @param props - Operation input
 * @param props.admin - Admin authentication contract; must be a valid admin
 *   (authorization already performed)
 * @param props.channelId - Unique identifier (UUID) of the channel to
 *   soft-delete
 * @returns Void
 * @throws {Error} If the specified channel does not exist
 */
export async function delete__shoppingMallAiBackend_admin_channels_$channelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId } = props;

  // 1. Fetch the channel by primary key
  const channel =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.findUnique({
      where: { id: channelId },
    });
  if (!channel) {
    throw new Error("Channel not found");
  }
  // 2. If already soft-deleted, return idempotently
  if (channel.deleted_at) return;

  // 3. Otherwise, set deleted_at with current timestamp
  await MyGlobal.prisma.shopping_mall_ai_backend_channels.update({
    where: { id: channelId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
