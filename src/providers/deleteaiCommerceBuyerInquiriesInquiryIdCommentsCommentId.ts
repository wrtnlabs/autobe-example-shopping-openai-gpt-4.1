import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Delete a comment from a specific inquiry (ai_commerce_comments, soft delete).
 *
 * This operation performs a soft delete (sets deleted_at timestamp) of the
 * comment under the specified inquiry, as the model supports logical removal.
 * Only the comment author (the authenticated buyer) may erase. All audit and
 * moderation histories are preserved according to compliance requirements.
 *
 * @param props - Operation properties
 * @param props.buyer - The authenticated buyer payload (must be comment owner)
 * @param props.inquiryId - The inquiry UUID this comment belongs to
 * @param props.commentId - The comment UUID to be deleted
 * @returns Void
 * @throws {Error} If the comment does not exist, has been deleted, does not
 *   match inquiry, or is not owned by this buyer
 */
export async function deleteaiCommerceBuyerInquiriesInquiryIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, inquiryId, commentId } = props;

  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
      author_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found, unauthorized, or already deleted");
  }

  await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
