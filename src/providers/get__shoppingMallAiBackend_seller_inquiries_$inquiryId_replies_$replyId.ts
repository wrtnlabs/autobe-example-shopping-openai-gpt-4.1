import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific inquiry reply by ID, ensuring permission checks.
 *
 * Retrieves a specific reply for a given inquiry by its unique identifier. This
 * operation returns all details about the reply, including its content, privacy
 * setting, author association (customer or seller), nested parent, and
 * creation/update timestamps. For private replies, only the relevant seller
 * (author or inquiry owner) may access the content; otherwise, access is
 * denied. All date/datetime values are returned as branded ISO strings.
 *
 * @param props - Request properties.
 * @param props.seller - The authenticated seller performing the query.
 * @param props.inquiryId - Unique identifier of the parent inquiry.
 * @param props.replyId - Unique identifier for the reply to retrieve.
 * @returns The full detail object of the inquiry reply, matching
 *   IShoppingMallAiBackendInquiryReply.
 * @throws {Error} If the reply or parent inquiry does not exist.
 * @throws {Error} If the seller is not authorized to access the reply (for
 *   private replies).
 */
export async function get__shoppingMallAiBackend_seller_inquiries_$inquiryId_replies_$replyId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { seller, inquiryId, replyId } = props;

  // Find the reply with matching inquiry and reply ID and not soft deleted
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
        deleted_at: null,
      },
    });
  if (!reply) throw new Error("Reply not found");

  // Find the parent inquiry for permission checking
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findUnique({
      where: { id: inquiryId },
    });
  if (!inquiry) throw new Error("Inquiry not found");

  // Authorization check: for private replies, seller must be the author or the inquiry's seller
  if (
    reply.private === true &&
    reply.seller_id !== seller.id &&
    inquiry.seller_id !== seller.id
  ) {
    throw new Error("Unauthorized to view this reply");
  }

  // Compute author_type: seller > customer > admin
  let author_type: "seller" | "customer" | "admin";
  if (reply.seller_id) author_type = "seller";
  else if (reply.customer_id) author_type = "customer";
  else author_type = "admin";

  return {
    id: reply.id,
    inquiry_id: reply.inquiry_id,
    parent_id: reply.parent_id ?? null,
    author_type: author_type,
    customer_id: reply.customer_id ?? null,
    seller_id: reply.seller_id ?? null,
    body: reply.body,
    private: reply.private,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    deleted_at: reply.deleted_at ? toISOStringSafe(reply.deleted_at) : null,
  };
}
