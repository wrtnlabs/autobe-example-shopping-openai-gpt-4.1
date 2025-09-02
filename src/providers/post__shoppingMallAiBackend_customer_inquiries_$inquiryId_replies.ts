import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new reply for an existing inquiry.
 *
 * This operation leverages the shopping_mall_ai_backend_inquiry_replies table
 * and requires an authenticated customer to provide all necessary details for
 * the reply. Mandatory fields include body (content), privacy flag, and
 * optionally a parent reply for nested/threaded replies. The reply is linked to
 * both the inquiry and the author and may be marked as private or public. Full
 * audit and compliance evidence are captured via timestamps and related fields,
 * as prescribed in Prisma schema shopping_mall_ai_backend_inquiry_replies.
 *
 * If the reply creation fails (e.g., due to invalid inquiryId), an error is
 * thrown. The response contains the complete reply entity with timestamps,
 * author reference, and relationship context.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer
 * @param props.inquiryId - UUID of the parent inquiry to reply to
 * @param props.body - Reply creation data (body, private, optional parent_id)
 * @returns The newly created reply entity
 * @throws {Error} When the parent inquiry does not exist
 */
export async function post__shoppingMallAiBackend_customer_inquiries_$inquiryId_replies(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.ICreate;
}): Promise<IShoppingMallAiBackendInquiryReply> {
  const { customer, inquiryId, body } = props;

  // Step 1: Validate that the parent inquiry exists
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findUnique({
      where: { id: inquiryId },
    });
  if (!inquiry) throw new Error("Inquiry not found");

  // Step 2: Prepare audit timestamps
  const now = toISOStringSafe(new Date());

  // Step 3: Create the reply row, binding the author to customer_id
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        inquiry_id: inquiryId,
        parent_id: body.parent_id ?? null,
        customer_id: customer.id,
        seller_id: null,
        body: body.body,
        private: body.private,
        created_at: now,
        updated_at: now,
      },
    });

  // Step 4: Map result to API DTO, with correct date and null handling
  return {
    id: created.id,
    inquiry_id: created.inquiry_id,
    parent_id: created.parent_id ?? null,
    author_type: "customer",
    customer_id: created.customer_id,
    seller_id: created.seller_id,
    body: created.body,
    private: created.private,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
