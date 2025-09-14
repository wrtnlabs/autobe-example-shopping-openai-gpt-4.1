import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";

/**
 * Get detailed information of an inquiry (ai_commerce_inquiries table).
 *
 * This operation retrieves detailed information for a specific product inquiry
 * by inquiry ID from the ai_commerce_inquiries table. It returns all core
 * fields including question, answer, author, timestamps, and status. Access
 * control for public/private is not present as this endpoint is public in the
 * spec.
 *
 * @param props - Request properties
 * @param props.inquiryId - Unique identifier for the inquiry to retrieve
 * @returns The full IAiCommerceInquiry entity for the specified inquiry ID
 * @throws {Error} When no inquiry record exists for the given ID
 */
export async function getaiCommerceInquiriesInquiryId(props: {
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceInquiry> {
  const { inquiryId } = props;
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findUnique({
    where: { id: inquiryId },
  });
  if (!inquiry) throw new Error("Inquiry not found");
  return {
    id: inquiry.id,
    author_id: inquiry.author_id,
    product_id: inquiry.product_id,
    question: inquiry.question,
    answer: typeof inquiry.answer !== "undefined" ? inquiry.answer : undefined,
    visibility: inquiry.visibility,
    status: inquiry.status,
    created_at: toISOStringSafe(inquiry.created_at),
    updated_at: toISOStringSafe(inquiry.updated_at),
    deleted_at:
      typeof inquiry.deleted_at === "undefined"
        ? undefined
        : inquiry.deleted_at === null
          ? null
          : toISOStringSafe(inquiry.deleted_at),
  };
}
