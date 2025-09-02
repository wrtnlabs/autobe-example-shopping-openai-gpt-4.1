import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a specific inquiry reply by ID, ensuring permission checks.
 *
 * This endpoint fetches a reply for a given inquiry by its unique identifier,
 * enforcing all business access rules:
 *
 * - Only the inquiry owner or the reply author (customer) may access the reply
 *   data via this endpoint.
 * - If the reply is private, only the participant (inquiry customer or reply
 *   customer) is allowed.
 * - Returns all reply fields including computed author_type and all audit
 *   timestamps.
 *
 * @param props - Request parameters including authenticated customer,
 *   inquiryId, and replyId
 * @param props.customer - The authenticated customer (JWT payload)
 * @param props.inquiryId - The UUID of the parent inquiry
 * @param props.replyId - The UUID of the reply to fetch
 * @returns The structured reply record with all fields, or throws error if not
 *   found or forbidden
 * @throws {Error} When the reply or inquiry is not found
 * @throws {Error} When the authenticated customer does not have permission to
 *   view the reply
 */
export async function get__shoppingMallAiBackend_customer_inquiries_$inquiryId_replies_$replyId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { customer, inquiryId, replyId } = props;

  // Fetch the reply, ensuring it belongs to the given inquiry and is not deleted
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
        deleted_at: null,
      },
    });
  if (!reply) {
    throw new Error("Reply not found");
  }

  // Fetch the inquiry, needed for access control (ownership/participation)
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findFirst({
      where: {
        id: inquiryId,
        deleted_at: null,
      },
    });
  if (!inquiry) {
    throw new Error("Inquiry not found");
  }

  // Access control: participant-only access (customer endpoint)
  const isParticipant =
    (reply.customer_id !== null && reply.customer_id === customer.id) ||
    (inquiry.customer_id !== null && inquiry.customer_id === customer.id);

  if (!isParticipant) {
    throw new Error("Forbidden: you are not allowed to view this reply.");
  }

  // author_type logic: only one of customer_id or seller_id is non-null
  let author_type: "customer" | "seller" | "admin";
  if (reply.customer_id !== null) {
    author_type = "customer";
  } else if (reply.seller_id !== null) {
    author_type = "seller";
  } else {
    author_type = "admin";
  }

  // Return all required fields, converting dates to string & tags.Format<'date-time'>, handling nullables properly
  return {
    id: reply.id,
    inquiry_id: reply.inquiry_id,
    parent_id: reply.parent_id ?? null,
    author_type,
    customer_id: reply.customer_id ?? null,
    seller_id: reply.seller_id ?? null,
    body: reply.body,
    private: reply.private,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    deleted_at: reply.deleted_at ? toISOStringSafe(reply.deleted_at) : null,
  };
}
