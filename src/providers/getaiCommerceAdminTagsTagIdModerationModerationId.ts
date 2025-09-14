import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific tag moderation log entry by tagId and moderationId.
 *
 * Retrieves the details of an individual moderation event for a tag, including
 * action, result, moderator, reason, and audit timestamp. Only admins may
 * access this endpoint for regulatory, evidence, or workflow purposes. Throws
 * an error if no such moderation event exists or access is not permitted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the lookup
 * @param props.tagId - UUID of the tag whose moderation record is being
 *   retrieved
 * @param props.moderationId - UUID of the moderation event for the tag
 * @returns The IAiCommerceTagModeration moderation log entry with full detail
 * @throws {Error} When the moderation event is not found or access is not
 *   permitted
 */
export async function getaiCommerceAdminTagsTagIdModerationModerationId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceTagModeration> {
  const { tagId, moderationId } = props;
  const moderation = await MyGlobal.prisma.ai_commerce_tag_moderation.findFirst(
    {
      where: { id: moderationId, ai_commerce_tag_id: tagId },
    },
  );
  if (moderation === null) {
    throw new Error(
      "Moderation event not found or you do not have permission.",
    );
  }
  return {
    id: moderation.id,
    ai_commerce_tag_id: moderation.ai_commerce_tag_id,
    moderation_action: moderation.moderation_action,
    moderated_by: moderation.moderated_by,
    moderation_reason: moderation.moderation_reason ?? undefined,
    created_at: toISOStringSafe(moderation.created_at),
  };
}
