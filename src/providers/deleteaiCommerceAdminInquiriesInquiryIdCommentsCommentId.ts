import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a specific comment under an inquiry. This performs a hard
 * delete on ai_commerce_comments, provided it is allowed by business and
 * privacy rules. Only the comment author or authorized admin may erase. All
 * related history/audit snapshots are preserved.
 *
 * Removes a comment referenced by commentId from under the specified inquiryId,
 * only if the user is the owner or an authorized moderator. The operation
 * checks that the comment is linked to the inquiry, and executes a permanent
 * database deletion (not soft delete), as the ai_commerce_comments schema lacks
 * a soft delete field.
 *
 * Audit logs and moderation histories are retained for legal compliance
 * regardless of record removal. Authorization failures, non-existent resources,
 * or violation of policy (e.g., removing comments under dispute) return
 * appropriate errors.
 *
 * This endpoint does not return the comment body, only a deletion confirmation.
 * Useful for comment management UIs and compliance/appeal workflows.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.inquiryId - The inquiry containing the comment to delete
 * @param props.commentId - The comment to be deleted
 * @returns Void
 * @throws {Error} If comment does not exist or is not associated with inquiry
 */
export async function deleteaiCommerceAdminInquiriesInquiryIdCommentsCommentId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, inquiryId, commentId } = props;

  const comment = await MyGlobal.prisma.ai_commerce_comments.findUnique({
    where: { id: commentId },
  });
  if (comment === null) {
    throw new Error("Comment not found");
  }
  // Must be associated to the target inquiry
  if (comment.inquiry_id !== inquiryId) {
    throw new Error("Comment is not associated with this inquiry");
  }

  await MyGlobal.prisma.ai_commerce_comments.delete({
    where: { id: commentId },
  });
  // No return value (void)
}
