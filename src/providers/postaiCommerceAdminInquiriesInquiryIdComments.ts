import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a comment under a specific inquiry (ai_commerce_comments).
 *
 * Allows an admin to post a new comment on an existing product inquiry. The
 * comment can optionally be a reply (threaded) to another comment, and is
 * linked to the inquiry and the authenticated admin as author. This operation
 * enforces strict validation of target inquiry existence, optional parent
 * threading, and correct permission. It populates all audit fields including
 * timestamps and status, ensuring integrity for compliance and moderation.
 *
 * Business rules:
 *
 * - Only active (not soft-deleted) inquiries can be commented on
 * - Parent comment (if provided) must be a comment for the same inquiry
 * - Comment body must be non-empty
 * - All date fields use ISO8601 strings (never Date type)
 * - Created comment is returned in full DTO structure
 *
 * @param props - Request payload containing:
 *
 *   - Props.admin: The authenticated admin user (AdminPayload)
 *   - Props.inquiryId: Inquiry ID to attach the comment to
 *   - Props.body: Fields to create the comment (IAiCommerceComment.ICreate)
 *
 * @returns The newly created comment record as IAiCommerceComment
 * @throws {Error} If the inquiry does not exist, the parent comment is invalid,
 *   or the body is empty
 */
export async function postaiCommerceAdminInquiriesInquiryIdComments(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { admin, inquiryId, body } = props;

  // Step 1: Ensure inquiry exists and is not soft-deleted
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: {
      id: inquiryId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!inquiry) {
    throw new Error("Inquiry not found or has been deleted");
  }

  // Step 2: If parent_comment_id is provided, ensure it is a comment on the same inquiry
  if (body.parent_comment_id !== undefined && body.parent_comment_id !== null) {
    const parent = await MyGlobal.prisma.ai_commerce_comments.findFirst({
      where: {
        id: body.parent_comment_id,
        inquiry_id: inquiryId,
      },
      select: { id: true },
    });
    if (!parent) {
      throw new Error("Parent comment does not exist for this inquiry");
    }
  }

  // Step 3: Validate body is a non-empty string
  if (!body.body || !body.body.trim()) {
    throw new Error("Comment body cannot be empty");
  }

  // Step 4: Prepare immutable creation fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const commentId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: commentId,
      author_id: admin.id,
      parent_comment_id: body.parent_comment_id ?? undefined,
      bulletin_id: undefined,
      inquiry_id: inquiryId,
      review_id: undefined,
      body: body.body,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
    },
  });

  // Step 5: Return complete comment structure, following DTO rules for null/undefined
  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: created.bulletin_id ?? undefined,
    inquiry_id: created.inquiry_id ?? undefined,
    review_id: created.review_id ?? undefined,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? undefined,
  };
}
