import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific reply to an inquiry by reply ID.
 *
 * Updates an existing reply in the shopping_mall_ai_backend_inquiry_replies
 * table. Only the reply author (customer or seller) or an admin can update the
 * body and privacy fields. All updates are recorded by snapshot for compliance
 * and audit, and only permitted fields are updated in-place.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the update
 * @param props.inquiryId - The inquiry's UUID this reply belongs to
 * @param props.replyId - The reply's UUID to update
 * @param props.body - The update data (body, private flag)
 * @returns The updated reply as IShoppingMallAiBackendInquiryReply
 * @throws {Error} When reply is not found, does not belong to the inquiry, or
 *   has been deleted
 */
export async function put__shoppingMallAiBackend_admin_inquiries_$inquiryId_replies_$replyId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.IUpdate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { admin, inquiryId, replyId, body } = props;
  // 1. Fetch reply (must be present, correct inquiry, and not deleted)
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findFirst({
      where: {
        id: replyId,
        inquiry_id: inquiryId,
        deleted_at: null,
      },
    });
  if (!reply) throw new Error("Reply not found or already deleted");

  // 2. Update allowed fields only if present and update updated_at to now
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
      where: { id: replyId },
      data: {
        body: body.body ?? undefined,
        private: body.private ?? undefined,
        updated_at: now,
      },
    });

  // 3. Insert immutable snapshot for audit/evidence
  await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_snapshots.create({
    data: {
      id: v4(),
      inquiry_id: updated.inquiry_id,
      reply_id: updated.id,
      title: undefined,
      body: updated.body,
      private: updated.private,
      status: undefined,
      closed_at: undefined,
      author_type: updated.customer_id
        ? "customer"
        : updated.seller_id
          ? "seller"
          : "admin",
      created_at: now,
    },
  });

  // 4. Map DB fields to DTO for return (all dates through toISOStringSafe, nullables set correctly)
  return {
    id: updated.id,
    inquiry_id: updated.inquiry_id,
    parent_id: updated.parent_id ?? null,
    author_type: updated.customer_id
      ? "customer"
      : updated.seller_id
        ? "seller"
        : "admin",
    customer_id: updated.customer_id ?? null,
    seller_id: updated.seller_id ?? null,
    body: updated.body,
    private: updated.private,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
