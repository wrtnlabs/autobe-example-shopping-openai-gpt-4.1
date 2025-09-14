import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a file attachment (ai_commerce_attachments table) and return
 * metadata/URI.
 *
 * Creates a new file attachment in the attachment subsystem. Used by
 * authenticated buyers to upload product images, evidence, or business files.
 * The function validates the buyer's identity, generates all metadata and a new
 * attachment ID, and stores the metadata in the database. File data itself is
 * handled elsewhere. Returns all attachment metadata, including timestamps and
 * current status.
 *
 * @param props - Arguments containing buyer authentication and attachment
 *   metadata:
 *
 *   - Buyer: BuyerPayload (must own the attachment)
 *   - Body: IAiCommerceAttachment.ICreate (file metadata and context)
 *
 * @returns IAiCommerceAttachment - Complete metadata object for the created
 *   attachment
 * @throws {Error} If buyer tries to upload for a different user
 */
export async function postaiCommerceBuyerAttachments(props: {
  buyer: BuyerPayload;
  body: IAiCommerceAttachment.ICreate;
}): Promise<IAiCommerceAttachment> {
  const { buyer, body } = props;

  if (buyer.id !== body.user_id) {
    throw new Error("You are only allowed to upload attachments for yourself.");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const attachment = await MyGlobal.prisma.ai_commerce_attachments.create({
    data: {
      id: v4(),
      user_id: body.user_id,
      filename: body.filename,
      business_type: body.business_type,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: attachment.id,
    user_id: attachment.user_id,
    filename: attachment.filename,
    business_type: attachment.business_type,
    status: attachment.status,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at:
      typeof attachment.deleted_at === "string"
        ? toISOStringSafe(attachment.deleted_at)
        : (attachment.deleted_at ?? null),
  };
}
