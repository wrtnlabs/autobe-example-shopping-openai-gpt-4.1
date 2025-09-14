import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update a product inquiry (ai_commerce_inquiries table).
 *
 * Allows the original buyer who authored the inquiry to mark it as updated.
 * Modifications are limited by the current DTO; only "touching" updated_at is
 * possible. This is enforced as a compliance and audit tracking update. No
 * actual inquiry fields are modifiable via this endpoint per
 * IAiCommerceInquiry.IUpdate.
 *
 * Permissions:
 *
 * - Only the inquiry's original author may perform this operation. Fails if
 *   attempted by other users.
 *
 * @param props - The update request data
 *
 *   - Props.buyer: The authenticated buyer payload
 *   - Props.inquiryId: The UUID of the inquiry to update
 *   - Props.body: The update object (currently no updatable fields)
 *
 * @returns The inquiry entity after the update
 * @throws {Error} If the inquiry does not exist or the user is unauthorized
 */
export async function putaiCommerceBuyerInquiriesInquiryId(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceInquiry.IUpdate;
}): Promise<IAiCommerceInquiry> {
  const { buyer, inquiryId } = props;

  // Fetch only active (not soft-deleted) inquiry row
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: {
      id: inquiryId,
      deleted_at: null,
    },
  });

  if (!inquiry) {
    throw new Error("Inquiry not found");
  }
  if (inquiry.author_id !== buyer.id) {
    throw new Error("Forbidden: Only the author can update this inquiry");
  }

  // Update only the updated_at timestamp
  const updated = await MyGlobal.prisma.ai_commerce_inquiries.update({
    where: { id: inquiryId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    author_id: updated.author_id,
    product_id: updated.product_id,
    question: updated.question,
    answer: updated.answer ?? undefined,
    visibility: updated.visibility,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
