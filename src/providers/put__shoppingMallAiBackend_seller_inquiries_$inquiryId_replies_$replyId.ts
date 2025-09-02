import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific reply to an inquiry by reply ID (seller flow).
 *
 * Updates an existing seller-authored reply in the
 * shopping_mall_ai_backend_inquiry_replies table. Only the reply seller may
 * modify body and privacy flag. Every update is audit snapshotted for
 * business/recovery compliance.
 *
 * - Auth check: Only the owning seller can update their reply. If not owned by
 *   seller, throws Error.
 * - Only non-null body/private fields are updated; all others preserved.
 *   Timestamps forcibly normalized to ISO string branding.
 * - After the update, an audit snapshot record is written to
 *   shopping_mall_ai_backend_inquiry_snapshots for evidence/recovery.
 * - Returns the updated reply, all date fields are (string &
 *   tags.Format<'date-time'>), no type assertions, no native Date anywhere.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the update (seller
 *   token)
 * @param props.inquiryId - The inquiry this reply belongs to
 * @param props.replyId - The reply to update
 * @param props.body - The update data: may include new body and/or privacy flag
 * @returns The updated inquiry reply as IShoppingMallAiBackendInquiryReply
 *   (date fields normalized)
 * @throws {Error} When reply not found, deleted, mismatched inquiryId, or
 *   seller is not owner
 */
export async function put__shoppingMallAiBackend_seller_inquiries_$inquiryId_replies_$replyId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.IUpdate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { seller, inquiryId, replyId, body } = props;

  // Step 1: Fetch existing reply for auth and validation
  const reply =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findUnique({
      where: { id: replyId },
    });
  if (!reply || reply.deleted_at !== null) {
    throw new Error("Reply not found or already deleted.");
  }
  if (reply.inquiry_id !== inquiryId) {
    throw new Error("Inquiry ID mismatch for reply.");
  }
  if (reply.seller_id !== seller.id) {
    throw new Error("Unauthorized: cannot update this reply.");
  }

  // Step 2: Compute current time and perform the update (only allowed fields). Do not change ownership or other fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.update({
      where: { id: replyId },
      data: {
        body: body.body ?? undefined,
        private: body.private ?? undefined,
        updated_at: now,
      },
    });

  // Step 3: Create an audit snapshot after mutation for recovery/audit
  await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      inquiry_id: updated.inquiry_id,
      reply_id: updated.id,
      title: null,
      body: updated.body,
      private: updated.private,
      status: null,
      closed_at: null,
      author_type: "seller",
      created_at: now,
    },
  });

  // Step 4: Map fields for DTO: never use type assertions; all timestamps safely converted
  return {
    id: updated.id,
    inquiry_id: updated.inquiry_id,
    parent_id: updated.parent_id ?? null,
    author_type: "seller",
    customer_id: updated.customer_id ?? null,
    seller_id: updated.seller_id ?? null,
    body: updated.body,
    private: updated.private,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
