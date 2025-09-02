import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft-deletes a specific reply in shopping_mall_ai_backend_inquiry_replies by
 * setting its deleted_at timestamp.
 *
 * This operation marks the reply as deleted for evidence, legal compliance, and
 * business logic, without physically removing it. Only the authoring customer
 * is permitted to perform this operation: access is denied if the current
 * customer did not author the reply. If the reply does not exist or has already
 * been deleted, an error is thrown.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload (JWT, contains id)
 * @param props.inquiryId - UUID of the inquiry to which the reply belongs
 * @param props.replyId - UUID of the reply to be soft-deleted
 * @returns Void
 * @throws {Error} When the reply does not exist, is already deleted, or the
 *   customer does not have permission to delete
 */
export async function delete__shoppingMallAiBackend_customer_inquiries_$inquiryId_replies_$replyId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, inquiryId, replyId } = props;

  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
      },
      select: {
        id: true,
        customer_id: true,
        deleted_at: true,
      },
    });

  if (!reply || reply.deleted_at !== null) {
    throw new Error("Reply not found or already deleted");
  }

  if (reply.customer_id !== customer.id) {
    throw new Error("Forbidden: Only the author can delete this reply");
  }

  await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
    where: { id: replyId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
