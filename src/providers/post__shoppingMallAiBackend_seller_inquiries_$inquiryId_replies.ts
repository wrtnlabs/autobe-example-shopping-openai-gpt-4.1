import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Creates a new reply for an existing inquiry as a seller.
 *
 * Registers a new reply within the shopping_mall_ai_backend_inquiry_replies
 * table as the authenticated seller. Accepts required content and privacy
 * fields, optional parent reply for threading, and links the reply to the
 * inquiry and the authenticated seller. Sets all audit fields and returns the
 * saved reply entity in compliance with the IShoppingMallAiBackendInquiryReply
 * DTO contract. No Date/native type or type assertion is used. All timestamps
 * and UUIDs are generated immutably.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller for reply creation
 * @param props.inquiryId - The UUID of the inquiry being replied to
 * @param props.body - The reply creation input including body text, privacy
 *   flag, and optional parent reply id
 * @returns The newly created reply including all relational and audit fields
 * @throws {Error} When a database or business constraint is violated (e.g.,
 *   invalid inquiryId, duplicate unique)
 */
export async function post__shoppingMallAiBackend_seller_inquiries_$inquiryId_replies(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.ICreate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        inquiry_id: props.inquiryId,
        parent_id: props.body.parent_id ?? null,
        customer_id: null,
        seller_id: props.seller.id,
        body: props.body.body,
        private: props.body.private,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    inquiry_id: created.inquiry_id,
    parent_id: created.parent_id ?? null,
    author_type: "seller",
    customer_id: null,
    seller_id: created.seller_id,
    body: created.body,
    private: created.private,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
