import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a comment under a specific inquiry (ai_commerce_comments).
 *
 * This operation allows a seller to post a new comment (response) to a given
 * inquiry. The seller must own the product related to the inquiry. The comment
 * is attached to the inquiry, assigned to the seller as author, and can be a
 * threaded reply if parent_comment_id is provided.
 *
 * All required and optional comment fields are processed, aligned with the
 * ai_commerce_comments schema and IAiCommerceComment DTO. If the inquiry does
 * not exist or the seller does not have valid permissions, an error is thrown.
 * All date-time fields are handled strictly as string &
 * tags.Format<'date-time'>.
 *
 * @param props - Parameters for comment creation
 * @param props.seller - SellerPayload (authenticated seller, contains id)
 * @param props.inquiryId - UUID of the inquiry to comment under
 * @param props.body - Data to create the comment (text, parent ID, status)
 * @returns Newly created IAiCommerceComment for the inquiry
 * @throws Error if the inquiry does not exist or seller does not own target
 *   product
 */
export async function postaiCommerceSellerInquiriesInquiryIdComments(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { seller, inquiryId, body } = props;

  // Verify inquiry exists and is not deleted
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: { id: inquiryId, deleted_at: null },
    select: { id: true, product_id: true },
  });
  if (!inquiry) {
    throw new Error("Inquiry not found or deleted");
  }

  // Verify the seller owns the product related to the inquiry
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: inquiry.product_id, seller_id: seller.id },
    select: { id: true },
  });
  if (!product) {
    throw new Error(
      "Unauthorized: Seller may only comment on inquiries for their own products",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the comment strictly for inquiry (not bulletin/review/comment)
  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: v4(),
      author_id: seller.id,
      parent_comment_id: body.parent_comment_id ?? null,
      bulletin_id: null,
      inquiry_id: inquiryId,
      review_id: null,
      body: body.body,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: undefined,
    inquiry_id: created.inquiry_id ?? undefined,
    review_id: undefined,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: undefined,
  };
}
