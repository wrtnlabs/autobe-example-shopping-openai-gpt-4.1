import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new reply for a specific inquiry (Admin API).
 *
 * This endpoint allows an authenticated admin to create a reply to an existing
 * inquiry. The reply is attributed to the admin (author_type = 'admin') and is
 * linked to both the specified inquiry and an optional parent reply for
 * threaded/nested discussions.
 *
 * All mandatory business and audit evidence fields are populated: IDs,
 * timestamps, author linkage, and privacy flag. Referential and logical
 * integrity is enforced by validating the existence of inquiry and (optionally)
 * parent reply.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin creating the reply
 * @param props.inquiryId - The UUID of the inquiry being replied to
 * @param props.body - The reply creation body (body, privacy flag, optional
 *   parent reply ID)
 * @returns IShoppingMallAiBackendInquiryReply - The newly created reply, fully
 *   populated per specification
 * @throws {Error} If the inquiry does not exist, or if specified parent reply
 *   does not exist or does not belong to the inquiry
 */
export async function post__shoppingMallAiBackend_admin_inquiries_$inquiryId_replies(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.ICreate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { admin, inquiryId, body } = props;

  // Validate that inquiry exists
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findUnique({
      where: { id: inquiryId },
    });
  if (!inquiry) throw new Error("Inquiry not found");

  // If parent_id is provided, ensure it exists and belongs to the same inquiry
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parentReply =
      await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findUnique(
        {
          where: { id: body.parent_id },
        },
      );
    if (!parentReply) throw new Error("Parent reply not found");
    if (parentReply.inquiry_id !== inquiryId)
      throw new Error("Parent reply does not belong to the specified inquiry");
  }

  // Timestamps
  const now = toISOStringSafe(new Date());

  // Create and persist the reply
  const createdReply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.create({
      data: {
        id: v4(),
        inquiry_id: inquiryId,
        parent_id: body.parent_id ?? null,
        customer_id: null, // Admin reply: no customer, no seller
        seller_id: null,
        body: body.body,
        private: body.private,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return API DTO, converting all dates to branded ISO strings
  return {
    id: createdReply.id,
    inquiry_id: createdReply.inquiry_id,
    parent_id: createdReply.parent_id ?? null,
    author_type: "admin",
    customer_id: null,
    seller_id: null,
    body: createdReply.body,
    private: createdReply.private,
    created_at: toISOStringSafe(createdReply.created_at),
    updated_at: toISOStringSafe(createdReply.updated_at),
    deleted_at: createdReply.deleted_at
      ? toISOStringSafe(createdReply.deleted_at)
      : null,
  };
}
