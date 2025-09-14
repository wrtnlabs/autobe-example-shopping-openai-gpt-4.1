import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detail of a single comment for a specific inquiry (ai_commerce_comments).
 *
 * Fetches the details of a comment by its commentId under a designated inquiry
 * (by inquiryId). This ensures the comment exactly belongs to the inquiry,
 * performs authorization so that only the product's seller may view, and
 * returns the full IAiCommerceComment fields including moderation context.
 * Throws not found if the comment is not attached to the inquiry, the inquiry
 * or product does not exist, or the seller does not have permission.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.seller - The authenticated seller making the request
 *   (SellerPayload; .id is their ai_commerce_buyer.id)
 * @param props.inquiryId - UUID of the inquiry to which the comment must belong
 * @param props.commentId - UUID of the comment to retrieve
 * @returns The detail fields for the ai_commerce_comments record, mapped to
 *   IAiCommerceComment
 * @throws {Error} When the comment/inquiry/product does not exist or seller has
 *   no access
 */
export async function getaiCommerceSellerInquiriesInquiryIdCommentsCommentId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { seller, inquiryId, commentId } = props;

  // 1. Find comment that belongs to this inquiry
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found for this inquiry.");
  }

  // 2. Lookup inquiry
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: { id: inquiryId },
  });
  if (!inquiry) {
    throw new Error("Parent inquiry does not exist.");
  }

  // 3. Lookup product for inquiry
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: inquiry.product_id },
  });
  if (!product) {
    throw new Error("Product not found for inquiry.");
  }

  // 4. Lookup seller by seller.buyer_id (auth payload)
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
  });
  if (!sellerRow) {
    throw new Error("Seller authorization failed.");
  }

  // 5. Authorization: confirm seller owns product
  if (product.seller_id !== sellerRow.id) {
    throw new Error("You are not authorized to view this comment.");
  }

  // 6. Map all fields and return exactly per IAiCommerceComment contract
  return {
    id: comment.id,
    author_id: comment.author_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    bulletin_id: comment.bulletin_id ?? undefined,
    inquiry_id: comment.inquiry_id ?? undefined,
    review_id: comment.review_id ?? undefined,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
