import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Soft delete an attachment file (ai_commerce_attachments table) by marking
 * deleted_at timestamp.
 *
 * This operation marks an attachment as deleted by updating its deleted_at
 * field to the current timestamp. Only the owner (buyer) of the attachment is
 * allowed to perform this operation. If the attachment is not found, already
 * deleted, or not owned by the buyer, an error is thrown. The operation is
 * compliant with audit and legal retention rules: the file is not physically
 * deleted, just marked as logically removed.
 *
 * @param props - The request object containing:
 *
 *   - Buyer: BuyerPayload; the authenticated buyer attempting the soft delete
 *   - AttachmentId: string & tags.Format<'uuid'>; the UUID of the attachment to
 *       delete
 *
 * @returns Void
 * @throws {Error} When attachment not found, already deleted, or user is not
 *   the owner
 */
export async function deleteaiCommerceBuyerAttachmentsAttachmentId(props: {
  buyer: BuyerPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, attachmentId } = props;
  // Fetch attachment, ensure it exists and is not already deleted
  const attachment = await MyGlobal.prisma.ai_commerce_attachments.findFirst({
    where: { id: attachmentId },
  });
  if (!attachment) {
    throw new Error("Attachment not found");
  }
  if (attachment.deleted_at !== null) {
    throw new Error("Attachment already deleted");
  }
  if (attachment.user_id !== buyer.id) {
    throw new Error("Cannot delete attachment not owned by user");
  }
  // Set deleted_at timestamp to the current time as ISO8601 string
  await MyGlobal.prisma.ai_commerce_attachments.update({
    where: { id: attachmentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
