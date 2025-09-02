import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a specific reply to an inquiry by reply ID.
 *
 * Updates an existing reply in the shopping_mall_ai_backend_inquiry_replies
 * table. This operation allows the reply author (customer or seller) or admins
 * to modify the body and privacy flag of their reply. The reply to update is
 * specified by inquiryId and replyId, and any modifications are fully tracked
 * for compliance. The schema mandates that only permitted fields are editable
 * and that full change history is preserved for audit via snapshots (handled
 * externally).
 *
 * Only the author (customer_id === authenticated customer) may update the reply
 * from this endpoint.
 *
 * @param props - Object containing:
 *
 *   - Customer: authenticated customer payload
 *   - InquiryId: unique inquiry UUID
 *   - ReplyId: unique reply UUID
 *   - Body: update information (body/private)
 *
 * @returns The updated reply entity as IShoppingMallAiBackendInquiryReply
 * @throws {Error} If reply is not found, deleted, or not owned by authenticated
 *   customer
 */
export async function put__shoppingMallAiBackend_customer_inquiries_$inquiryId_replies_$replyId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.IUpdate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { customer, inquiryId, replyId, body } = props;

  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
        deleted_at: null,
      },
    });
  if (!reply) throw new Error("Reply not found");
  if (reply.customer_id !== customer.id) {
    throw new Error("Forbidden: You are not the author of this reply");
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
      where: { id: replyId },
      data: {
        body: body.body ?? undefined,
        private: body.private ?? undefined,
        updated_at: now,
      },
      select: {
        id: true,
        inquiry_id: true,
        parent_id: true,
        customer_id: true,
        seller_id: true,
        body: true,
        private: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: updated.id,
    inquiry_id: updated.inquiry_id,
    parent_id: updated.parent_id ?? null,
    author_type: "customer",
    customer_id: updated.customer_id ?? null,
    seller_id: updated.seller_id ?? null,
    body: updated.body,
    private: updated.private,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
