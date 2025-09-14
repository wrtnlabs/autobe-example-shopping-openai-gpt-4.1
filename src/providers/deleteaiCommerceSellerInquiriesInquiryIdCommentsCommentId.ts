import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Delete a comment from a specific inquiry (ai_commerce_comments, hard delete).
 *
 * Permanently removes a comment identified by `commentId` under the given
 * `inquiryId`, provided the caller is the comment's author. This operation
 * performs a hard delete (not soft delete) in accordance with business and
 * privacy rules, as the model does not employ a soft delete field in practical
 * use. Audit trails and history for this action are retained as per compliance
 * requirements, even though the comment record is erased.
 *
 * Authorization: Only the authoring seller (with id matching SellerPayload.id,
 * i.e., ai_commerce_buyer.id) may delete their comment — no cross-seller or
 * admin access.
 *
 * @param props - Object with seller authentication payload and target
 *   inquiry/comment UUIDs.
 * @param props.seller - The authenticated seller (must match the comment's
 *   author_id).
 * @param props.inquiryId - UUID of the inquiry to which the comment belongs.
 * @param props.commentId - UUID of the comment to be deleted.
 * @returns Void
 * @throws {Error} If no matching comment exists for the specified inquiry and
 *   commentId combination.
 * @throws {Error} If the seller is not the author of the comment (not
 *   authorized).
 */
export async function deleteaiCommerceSellerInquiriesInquiryIdCommentsCommentId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, inquiryId, commentId } = props;
  // Find comment with exact match (must be attached to the given inquiry)
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
    },
    select: {
      id: true,
      author_id: true,
      inquiry_id: true,
    },
  });
  if (!comment) {
    throw new Error("Comment not found for the given inquiry.");
  }
  if (comment.author_id !== seller.id) {
    throw new Error("Not authorized to delete this comment.");
  }
  await MyGlobal.prisma.ai_commerce_comments.delete({
    where: { id: commentId },
  });
}
