import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete a reply to a given inquiry (preserving for audit).
 *
 * Soft-deletes the specified reply belonging to a given inquiry. The deleted_at
 * field is set to the current timestamp to preserve the evidence trail for
 * business, compliance, or legal review. This operation is allowed for reply
 * authors (customer or seller) or admins with proper authorization. Admins may
 * delete any reply regardless of author for regulatory/audit needs.
 *
 * Attempting to delete a reply not authored by the current user or without
 * sufficient permission will result in an error response. This supports
 * regulatory and compliance scenarios in buyer-seller-admin engagement
 * workflows.
 *
 * @param props - Object containing:
 * @param props.admin - The admin performing this operation (AdminPayload from
 *   decorator context)
 * @param props.inquiryId - Unique identifier of the inquiry to which the reply
 *   belongs
 * @param props.replyId - Unique identifier for the reply to erase (soft-delete)
 * @returns Void on success (idempotent if already deleted)
 * @throws {Error} If the reply does not exist, or does not belong to the
 *   specified inquiry
 */
export async function delete__shoppingMallAiBackend_admin_inquiries_$inquiryId_replies_$replyId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { inquiryId, replyId } = props;

  // Find the reply by its ID and check it belongs to the specified inquiry
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (!reply) {
    throw new Error("Reply not found or does not belong to specified inquiry");
  }
  if (reply.deleted_at) {
    // Already soft deleted (idempotent)
    return;
  }

  // Perform soft delete - set deleted_at to now (ISO8601 string)
  await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
    where: { id: replyId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  return;
}
