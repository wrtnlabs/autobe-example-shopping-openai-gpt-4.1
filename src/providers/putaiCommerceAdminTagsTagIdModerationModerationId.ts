import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin updates an existing moderation record for a tag
 * (ai_commerce_tag_moderation).
 *
 * This operation updates a tag moderation record's action or reason for
 * compliance/audit purposes. Admins may adjust prior decisions in light of new
 * evidence, appeals, or corrections. Updates are limited to moderation_action
 * and moderation_reason. The moderationId must belong to the tagId, and only
 * admins are authorized. All events are tracked for business traceability.
 *
 * @param props - Properties for updating tag moderation
 * @param props.admin - The authenticated admin user performing the update
 * @param props.tagId - The target tag's unique ID for which moderation is being
 *   updated
 * @param props.moderationId - The moderation record's unique ID to be updated
 * @param props.body - The requested updates (action and/or reason). Both are
 *   optional for patch
 * @returns The updated moderation record as IAiCommerceTagModeration
 * @throws {Error} If the moderation record does not exist or does not belong to
 *   the specified tag
 */
export async function putaiCommerceAdminTagsTagIdModerationModerationId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
  body: IAiCommerceTagModeration.IUpdate;
}): Promise<IAiCommerceTagModeration> {
  // 1. Verify moderation record exists and belongs to the tagId
  const moderation = await MyGlobal.prisma.ai_commerce_tag_moderation.findFirst(
    {
      where: {
        id: props.moderationId,
        ai_commerce_tag_id: props.tagId,
      },
    },
  );
  if (moderation === null) {
    throw new Error(
      "Moderation record not found or does not belong to the specified tag",
    );
  }

  // 2. Perform patch update of allowed fields (only those present)
  const updated = await MyGlobal.prisma.ai_commerce_tag_moderation.update({
    where: { id: props.moderationId },
    data: {
      moderation_action: props.body.moderation_action ?? undefined,
      moderation_reason: props.body.moderation_reason ?? undefined,
    },
  });

  // 3. Map model to API DTO (handling null/undefined for moderation_reason)
  return {
    id: updated.id,
    ai_commerce_tag_id: updated.ai_commerce_tag_id,
    moderation_action: updated.moderation_action,
    moderated_by: updated.moderated_by,
    moderation_reason:
      updated.moderation_reason === null
        ? undefined
        : updated.moderation_reason,
    created_at: toISOStringSafe(updated.created_at),
  };
}
