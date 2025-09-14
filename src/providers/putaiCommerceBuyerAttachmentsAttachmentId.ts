import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAttachment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Updates an attachment's metadata (filename, business_type, status) for a
 * buyer-owned file.
 *
 * Validates ownership and soft-deletion, updates only provided fields, and
 * compliance-logs every change. Date fields are safely stringified, all updates
 * are immutable, and full audit logging is performed post-update.
 *
 * @param props The operation props containing:
 *
 *   - Buyer: Current authenticated buyer payload
 *   - AttachmentId: UUID of the attachment
 *   - Body: Update payload (filename, business_type, status)
 *
 * @returns Updated IAiCommerceAttachment DTO
 * @throws Error if not owner or not accessible, or if not found
 */
export async function putaiCommerceBuyerAttachmentsAttachmentId(props: {
  buyer: BuyerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IAiCommerceAttachment.IUpdate;
}): Promise<IAiCommerceAttachment> {
  // 1. Ownership and existence validation
  const attachment = await MyGlobal.prisma.ai_commerce_attachments.findFirst({
    where: {
      id: props.attachmentId,
      user_id: props.buyer.id,
      deleted_at: null,
    },
  });
  if (!attachment)
    throw new Error(
      "Forbidden: You may only update your own, active attachments",
    );

  // 2. Prepare a data object with only fields present, immutably
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.filename !== undefined && { filename: props.body.filename }),
    ...(props.body.business_type !== undefined && {
      business_type: props.body.business_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: now,
  };

  // If nothing provided, do not update
  if (Object.keys(updateData).length === 1)
    // Only updated_at
    return {
      id: attachment.id,
      user_id: attachment.user_id,
      filename: attachment.filename,
      business_type: attachment.business_type,
      status: attachment.status,
      created_at: toISOStringSafe(attachment.created_at),
      updated_at: toISOStringSafe(attachment.updated_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : undefined,
    };

  // 3. Execute the update
  const updated = await MyGlobal.prisma.ai_commerce_attachments.update({
    where: { id: props.attachmentId },
    data: updateData,
  });

  // 4. Audit log the change (required fields per schema)
  await MyGlobal.prisma.ai_commerce_attachment_access_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      attachment_id: props.attachmentId,
      user_id: props.buyer.id,
      access_type: "update", // or 'metadata_update' per business convention
      result: "success",
      timestamp: now,
    },
  });

  // 5. Return updated object matching IAiCommerceAttachment
  return {
    id: updated.id,
    user_id: updated.user_id,
    filename: updated.filename,
    business_type: updated.business_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
