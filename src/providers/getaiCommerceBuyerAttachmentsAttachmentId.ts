import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve metadata and access info for an attachment (ai_commerce_attachments
 * table).
 *
 * Retrieves attachment metadata for a buyer's own file, enforcing strict
 * row-level access control. Returns only metadata fields with all date fields
 * as ISO 8601 strings. Throws errors if not found or if ownership check fails.
 * Does not expose or mutate file contents; compliance/audit logging handled
 * downstream.
 *
 * @param props - Object containing buyer authentication and attachment ID
 * @param props.buyer - Authenticated buyer making the request (row-level
 *   access)
 * @param props.attachmentId - UUID of the target attachment file
 * @returns Attachment metadata as IAiCommerceAttachment object
 * @throws {Error} If the attachment does not exist
 * @throws {Error} If the attachment does not belong to the authenticated buyer
 */
export async function getaiCommerceBuyerAttachmentsAttachmentId(props: {
  buyer: BuyerPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceAttachment> {
  const { buyer, attachmentId } = props;

  const attachment = await MyGlobal.prisma.ai_commerce_attachments.findFirst({
    where: { id: attachmentId },
  });
  if (!attachment) {
    throw new Error("Attachment not found");
  }
  if (attachment.user_id !== buyer.id) {
    throw new Error("Forbidden: not your attachment");
  }

  return {
    id: attachment.id,
    user_id: attachment.user_id,
    filename: attachment.filename,
    business_type: attachment.business_type,
    status: attachment.status,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at:
      attachment.deleted_at !== null && attachment.deleted_at !== undefined
        ? toISOStringSafe(attachment.deleted_at)
        : undefined,
  };
}
