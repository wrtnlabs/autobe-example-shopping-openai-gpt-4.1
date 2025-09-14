import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";

/**
 * Retrieve specific comment by bulletin and comment ID (ai_commerce_comments).
 *
 * Retrieves the details of a single comment associated with a given bulletin,
 * enforcing both comment and bulletin linkage. Non-existent, cross-bulletin, or
 * soft-deleted comments trigger an error. Handles full DTO conformance,
 * field-by-field mapping, and full ISO string conversion.
 *
 * @param props - BulletinId: Bulletin ID for context (string &
 *   tags.Format<'uuid'>). commentId: Unique comment ID to retrieve (string &
 *   tags.Format<'uuid'>).
 * @returns IAiCommerceComment
 * @throws Error if comment is not found, does not belong to bulletin, or is
 *   soft-deleted.
 */
export async function getaiCommerceBulletinsBulletinIdCommentsCommentId(props: {
  bulletinId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const row = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: props.commentId,
      bulletin_id: props.bulletinId,
      deleted_at: null,
    },
  });
  if (!row) {
    throw new Error(
      "Comment not found or does not belong to specified bulletin, or has been deleted",
    );
  }
  return {
    id: row.id,
    author_id: row.author_id,
    parent_comment_id: row.parent_comment_id ?? undefined,
    bulletin_id: row.bulletin_id ?? undefined,
    inquiry_id: row.inquiry_id ?? undefined,
    review_id: row.review_id ?? undefined,
    body: row.body,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
