import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new comment on a specific bulletin (ai_commerce_comments table).
 *
 * This endpoint allows an authenticated buyer to create a comment on a target
 * bulletin post. Only existing and non-deleted bulletins can be commented on.
 * Supports top-level comments and threaded replies. The created comment will be
 * associated to the bulletin, and linked to the current user via author_id.
 * Only bulletin_id is set—unrelated fields (inquiry_id, review_id) are left
 * undefined. Comment's status is set from payload or defaults to 'published'.
 * All dates are returned as string & tags.Format<'date-time'>. id is a uuidV4.
 *
 * @param props - Object containing authentication (buyer), bulletinId path
 *   param, and comment create body
 * @param props.buyer - The authenticated buyer creating the comment
 * @param props.bulletinId - UUID of the bulletin to which the comment is
 *   attached
 * @param props.body - Comment creation object, including main content and
 *   (optionally) parent_comment_id and status
 * @returns The created IAiCommerceComment entity – with all timestamps as ISO
 *   strings and uuid branding
 * @throws {Error} If bulletin does not exist or is deleted
 */
export async function postaiCommerceBuyerBulletinsBulletinIdComments(props: {
  buyer: BuyerPayload;
  bulletinId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { buyer, bulletinId, body } = props;
  // 1. Validate bulletin exists and is not deleted
  const bulletin = await MyGlobal.prisma.ai_commerce_bulletins.findFirst({
    where: { id: bulletinId, deleted_at: null },
  });
  if (!bulletin) {
    throw new Error("Target bulletin not found or deleted.");
  }
  // 2. Prepare all fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newComment = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_id: buyer.id,
      parent_comment_id: body.parent_comment_id ?? null,
      bulletin_id: bulletinId,
      body: body.body,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // Not an inquiry or review comment
      inquiry_id: undefined,
      review_id: undefined,
    },
  });
  // 3. Return mapped result (no Date type anywhere)
  return {
    id: newComment.id,
    author_id: newComment.author_id,
    parent_comment_id: newComment.parent_comment_id ?? null,
    bulletin_id: newComment.bulletin_id,
    inquiry_id: newComment.inquiry_id ?? undefined,
    review_id: newComment.review_id ?? undefined,
    body: newComment.body,
    status: newComment.status,
    created_at: toISOStringSafe(newComment.created_at),
    updated_at: toISOStringSafe(newComment.updated_at),
    deleted_at: newComment.deleted_at
      ? toISOStringSafe(newComment.deleted_at)
      : undefined,
  };
}
