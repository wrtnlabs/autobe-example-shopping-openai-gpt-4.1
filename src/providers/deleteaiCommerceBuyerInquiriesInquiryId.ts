import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Delete (logically) a product inquiry (soft delete via ai_commerce_inquiries
 * table).
 *
 * This endpoint enables a user to mark an inquiry as deleted by setting its
 * deleted_at timestamp (soft delete). Only the creator of the inquiry is
 * allowed to delete; otherwise, an error is thrown. Soft deletion preserves the
 * record for audit/compliance but hides it from queries.
 *
 * @param props - Request parameter object.
 * @param props.buyer - Authenticated buyer payload performing the delete.
 * @param props.inquiryId - Unique identifier of the inquiry to be deleted.
 * @returns Void
 * @throws {Error} If the inquiry does not exist or is already deleted, throws
 *   'Inquiry not found'.
 * @throws {Error} If the buyer is not the author, throws 'Forbidden: Only the
 *   inquiry author can delete'.
 */
export async function deleteaiCommerceBuyerInquiriesInquiryId(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, inquiryId } = props;
  // Step 1: Fetch inquiry by ID, skip deleted
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: {
      id: inquiryId,
      deleted_at: null,
    },
    select: { id: true, author_id: true },
  });
  if (!inquiry) {
    throw new Error("Inquiry not found");
  }
  // Step 2: Ownership check
  if (inquiry.author_id !== buyer.id) {
    throw new Error("Forbidden: Only the inquiry author can delete");
  }
  // Step 3: Soft delete by setting deleted_at
  await MyGlobal.prisma.ai_commerce_inquiries.update({
    where: { id: inquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // (Optional: Audit log if schema/model exists)
}
