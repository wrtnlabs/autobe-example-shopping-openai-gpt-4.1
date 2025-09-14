import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin creates a new moderation/action record for a specific tag
 * (ai_commerce_tags).
 *
 * This endpoint allows platform administrators to record a moderation action
 * such as 'approve', 'reject', 'flag', or 'suspend' on an existing tag entity.
 * Each moderation event is linked to the acting admin, the target tag, and can
 * include an optional rationale for compliance and audit purposes. Successful
 * moderation is logged as a new record, including a unique identifier and
 * precise event timestamp.
 *
 * Only authenticated admins may call this endpoint; all moderation events are
 * used for audit, workflow tracking, and compliance reporting.
 *
 * @param props - Properties for this action
 * @param props.admin - Authenticated admin payload (provides admin.id)
 * @param props.tagId - Unique tag identifier to be moderated (UUID)
 * @param props.body - Moderation action (action must be 'approve', 'reject',
 *   'flag', or 'suspend'; reason is optional)
 * @returns The newly created moderation record for this tag
 * @throws {Error} If the moderation action could not be created (unexpected
 *   system error)
 */
export async function postaiCommerceAdminTagsTagIdModeration(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IAiCommerceTagModeration.ICreate;
}): Promise<IAiCommerceTagModeration> {
  const moderationId: string & tags.Format<"uuid"> = v4();
  const moderationCreatedAt: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_tag_moderation.create({
    data: {
      id: moderationId,
      ai_commerce_tag_id: props.tagId,
      moderation_action: props.body.moderation_action,
      moderated_by: props.admin.id,
      moderation_reason: props.body.moderation_reason ?? undefined,
      created_at: moderationCreatedAt,
    },
  });

  return {
    id: created.id,
    ai_commerce_tag_id: created.ai_commerce_tag_id,
    moderation_action: created.moderation_action,
    moderated_by: created.moderated_by,
    moderation_reason: created.moderation_reason ?? undefined,
    created_at: created.created_at as string & tags.Format<"date-time">,
  };
}
