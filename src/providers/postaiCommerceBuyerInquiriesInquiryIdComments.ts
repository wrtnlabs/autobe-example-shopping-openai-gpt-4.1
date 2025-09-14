import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a comment under a specific inquiry (ai_commerce_comments).
 *
 * This operation creates a new comment and attaches it to the given inquiry,
 * linking the new comment to both the inquiry and the author (buyer). It
 * requires that the inquiry exists and that the authenticated buyer is the
 * author of that inquiry. The comment body must be non-empty. Supports threaded
 * replies using parent_comment_id. Fields not relevant to inquiry-based
 * comments (bulletin_id, review_id) are omitted. All dates are formatted as ISO
 * string & tags.Format<'date-time'>.
 *
 * @param props - Properties required to create a comment under an inquiry:
 *
 *   - Buyer: the authenticated buyer posting the comment
 *   - InquiryId: the inquiry to attach the comment to (UUID)
 *   - Body: comment creation payload (body text, optional parent, etc)
 *
 * @returns The newly created comment's full IAiCommerceComment record.
 * @throws {Error} If inquiry does not exist, buyer is unauthorized, or body is
 *   empty
 */
export async function postaiCommerceBuyerInquiriesInquiryIdComments(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { buyer, inquiryId, body } = props;

  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: { id: inquiryId, deleted_at: null },
    select: { id: true, author_id: true },
  });
  if (!inquiry) throw new Error("Inquiry not found");
  if (inquiry.author_id !== buyer.id)
    throw new Error("Unauthorized: You can only comment on your own inquiries");

  const trimmedBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!trimmedBody) throw new Error("Comment body cannot be empty");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_id: buyer.id,
      inquiry_id: inquiryId,
      parent_comment_id: body.parent_comment_id ?? undefined,
      bulletin_id: undefined,
      review_id: undefined,
      body: trimmedBody,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: undefined,
    inquiry_id: created.inquiry_id,
    review_id: undefined,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
