import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Logically delete (soft delete) an inquiry by ID, preserving evidence.
 *
 * Mark the specified inquiry as logically deleted by setting the deleted_at
 * field to the current timestamp. Only the owner (customer) may perform this
 * operation. No data is physically removed, supporting evidence preservation
 * and compliance audits.
 *
 * - Throws Error('Not found') if the inquiry does not exist or has already been
 *   deleted.
 * - Throws Error('Forbidden') if the current customer does not own the inquiry.
 *
 * @param props - The request properties
 * @param props.customer - The authenticated customer
 * @param props.inquiryId - The UUID of the inquiry to delete
 * @returns Void
 * @throws {Error} When the inquiry does not exist or is already deleted
 * @throws {Error} When the current customer is not the resource owner
 */
export async function delete__shoppingMallAiBackend_customer_inquiries_$inquiryId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, inquiryId } = props;

  // Fetch inquiry (must not be already soft deleted)
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findFirst({
      where: {
        id: inquiryId,
      },
    });

  if (!inquiry || inquiry.deleted_at !== null) {
    throw new Error("Not found");
  }
  if (inquiry.customer_id !== customer.id) {
    throw new Error("Forbidden");
  }

  await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.update({
    where: { id: inquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
