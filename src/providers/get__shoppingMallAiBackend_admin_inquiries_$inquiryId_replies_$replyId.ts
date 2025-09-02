import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific inquiry reply by ID, ensuring permission checks.
 *
 * This endpoint allows an admin to retrieve all details about a reply to a
 * given inquiry, including its content, privacy flag, author association
 * (customer, seller, admin), parent reply reference, and all timestamps.
 *
 * - Cross-role admin access: Admins can view any reply for moderation, audit, or
 *   compliance by policy.
 * - Enforces reply existence, non-deletion (soft delete awareness), and matches
 *   the provided inquiryId/replyId.
 * - All date/time fields delivered as brand ISO strings. No Date type in types or
 *   assignment.
 *
 * @param props - Request properties
 * @param props.admin - The admin requesting access (with full platform
 *   privileges)
 * @param props.inquiryId - UUID of the parent inquiry
 * @param props.replyId - UUID for the reply to retrieve
 * @returns All fields for the reply, including content, privacy, parent
 *   linkage, and correctly branded timestamps
 * @throws {Error} If the reply does not exist, is deleted, or does not belong
 *   to the provided inquiry
 */
export async function get__shoppingMallAiBackend_admin_inquiries_$inquiryId_replies_$replyId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { inquiryId, replyId } = props;
  // Query for the exact reply, only if not soft deleted and inquiry_id matches
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
        deleted_at: null,
      },
    });
  if (!reply) throw new Error("Inquiry reply not found");
  // Infer author_type based on which author id is present
  let author_type: "customer" | "seller" | "admin" = "admin";
  if (reply.customer_id) author_type = "customer";
  else if (reply.seller_id) author_type = "seller";
  return {
    id: reply.id,
    inquiry_id: reply.inquiry_id,
    parent_id: typeof reply.parent_id === "string" ? reply.parent_id : null,
    author_type,
    customer_id:
      typeof reply.customer_id === "string" ? reply.customer_id : null,
    seller_id: typeof reply.seller_id === "string" ? reply.seller_id : null,
    body: reply.body,
    private: reply.private,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    deleted_at: reply.deleted_at ? toISOStringSafe(reply.deleted_at) : null,
  };
}
