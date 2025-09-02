import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Soft-deletes a reply to a given inquiry (preserving for audit).
 *
 * This endpoint allows an authenticated seller to logically delete
 * (soft-delete) a reply they authored under a given inquiry. The deleted_at
 * field is set to the current timestamp, ensuring the reply is hidden from
 * standard retrievals but retained for compliance, audit, and evidence
 * purposes. If the reply does not exist or the requesting seller is not the
 * author, an error is thrown. Only the original seller- author may delete their
 * reply via this operation; admin/cross-user deletions are not permitted here.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller account initiating deletion
 * @param props.inquiryId - Unique ID of the inquiry to which the reply belongs
 * @param props.replyId - Unique ID of the reply to be soft-deleted
 * @returns Void
 * @throws {Error} When the reply is not found
 * @throws {Error} When the seller is not the author of the reply
 */
export async function delete__shoppingMallAiBackend_seller_inquiries_$inquiryId_replies_$replyId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, inquiryId, replyId } = props;
  // Find reply with exact inquiry/reply match
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
      },
    });
  if (!reply) {
    throw new Error("Reply not found");
  }
  // Check strict authorship
  if (reply.seller_id !== seller.id) {
    throw new Error(
      "Unauthorized: Only the author seller can delete their reply",
    );
  }
  // Perform soft-delete, always using toISOStringSafe for date
  await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
    where: { id: replyId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
