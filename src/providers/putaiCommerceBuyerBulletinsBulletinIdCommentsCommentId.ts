import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Updates an existing comment on a bulletin.
 *
 * This operation allows the author (buyer) to update the content or status of a
 * specific comment associated with a bulletin post. The update is strictly
 * permitted only for the original author. Each modification is logged in the
 * edit history for compliance and auditability. No Date types or type
 * assertions are used; all ISO date-time and UUIDs are handled as string types
 * with correct branding.
 *
 * @param props - Properties required for updating a comment
 * @param props.buyer - The authenticated buyer performing the update
 * @param props.bulletinId - The bulletin ID this comment is attached to
 * @param props.commentId - The comment ID to update
 * @param props.body - The update to apply (may include body, status,
 *   visibility)
 * @returns The updated comment entity (IAiCommerceComment)
 * @throws {Error} If comment does not exist, is deleted, or buyer is not the
 *   owner
 */
export async function putaiCommerceBuyerBulletinsBulletinIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  bulletinId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { buyer, bulletinId, commentId, body } = props;

  // Locate the comment (must match bulletin, not deleted)
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      bulletin_id: bulletinId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }
  // Only author may update
  if (comment.author_id !== buyer.id) {
    throw new Error("Only the comment owner (buyer) may update this comment");
  }

  // Audit: capture pre-update state
  const before_state = JSON.stringify(comment);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Apply update (only provided fields + updated_at)
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: {
      body: body.body ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  // Audit: capture post-update state
  const after_state = JSON.stringify(updated);
  await MyGlobal.prisma.ai_commerce_ugc_edit_history.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ugc_entity_comment_id: commentId,
      actor_id: buyer.id,
      before_state,
      after_state,
      edit_summary: "buyer-edit",
      created_at: now,
    },
  });

  // Compose return object (map Date -> string, handle optionals/nullables)
  return {
    id: updated.id,
    author_id: updated.author_id,
    parent_comment_id: updated.parent_comment_id ?? undefined,
    bulletin_id: updated.bulletin_id ?? undefined,
    inquiry_id: updated.inquiry_id ?? undefined,
    review_id: updated.review_id ?? undefined,
    body: updated.body,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
