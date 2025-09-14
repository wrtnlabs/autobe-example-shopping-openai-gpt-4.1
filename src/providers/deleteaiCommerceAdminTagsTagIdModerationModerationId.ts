import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove an existing moderation decision related to a specific tag
 * from the ai_commerce_tag_moderation table.
 *
 * Only callable by authenticated admins. Ensures the moderationId belongs to
 * the specified tag before deletion. This is a hard delete (no soft-delete
 * field) and intended only for legal/audit edge cases. All errors throw with
 * clear messages if no record is found or tag association is invalid.
 *
 * @param props - Input properties for tag moderation deletion
 * @param props.admin - The authenticated admin performing this action
 * @param props.tagId - The unique tag ID whose moderation record is being
 *   deleted
 * @param props.moderationId - The moderation record ID to be deleted
 * @returns Void (promise)
 * @throws {Error} If moderation record is not found
 * @throws {Error} If the record does not belong to that tag
 */
export async function deleteaiCommerceAdminTagsTagIdModerationModerationId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the moderation record
  const moderation =
    await MyGlobal.prisma.ai_commerce_tag_moderation.findUnique({
      where: { id: props.moderationId },
    });
  if (!moderation) {
    throw new Error("Moderation record not found");
  }
  if (moderation.ai_commerce_tag_id !== props.tagId) {
    throw new Error("Moderation record does not belong to the specified tag");
  }
  // Hard delete
  await MyGlobal.prisma.ai_commerce_tag_moderation.delete({
    where: { id: props.moderationId },
  });
}
