import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detail of a single comment for a specific inquiry (ai_commerce_comments).
 *
 * Fetches a comment by its unique commentId, ensuring it belongs to the
 * provided inquiryId. Enforces that only the author of the inquiry (buyer) can
 * view the comment. Throws not found if either record is missing, or forbidden
 * on unauthorized access. All date fields are returned as ISO 8601 strings, and
 * optional/nullable fields are mapped as per IAiCommerceComment type.
 *
 * @param props - Properties for the retrieval
 * @param props.buyer - The authenticated buyer making the request
 * @param props.inquiryId - The inquiry's unique identifier (UUID)
 * @param props.commentId - The comment's unique identifier (UUID)
 * @returns Full IAiCommerceComment detail, or throws on failure
 * @throws {Error} If the comment or inquiry does not exist, or on insufficient
 *   privileges
 */
export async function getaiCommerceBuyerInquiriesInquiryIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { buyer, inquiryId, commentId } = props;

  // Fetch comment for the given inquiry
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }

  // Fetch inquiry and ensure the buyer owns it
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findUnique({
    where: { id: inquiryId },
  });
  if (!inquiry) {
    throw new Error("Inquiry not found");
  }
  if (inquiry.author_id !== buyer.id) {
    throw new Error("Forbidden: Only the author can view this comment");
  }

  return {
    id: comment.id,
    author_id: comment.author_id,
    parent_comment_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
    bulletin_id: comment.bulletin_id === null ? undefined : comment.bulletin_id,
    inquiry_id: comment.inquiry_id === null ? undefined : comment.inquiry_id,
    review_id: comment.review_id === null ? undefined : comment.review_id,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null
        ? undefined
        : toISOStringSafe(comment.deleted_at),
  };
}
