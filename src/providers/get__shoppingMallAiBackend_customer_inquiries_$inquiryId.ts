import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve the complete details for a specific inquiry (customer/seller
 * question or support ticket) using its unique inquiry ID.
 *
 * Only the owner customer may access their inquiry. Returns all business and
 * audit attributes for viewing and moderation. Throws error if the inquiry does
 * not exist or if access is forbidden as per business policy.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer (authorization required)
 * @param props.inquiryId - UUID of the inquiry to retrieve
 * @returns The full inquiry object, including ownership info, content, and all
 *   audit timestamps
 * @throws {Error} When the inquiry is not found by this id, or has been deleted
 *   (404)
 * @throws {Error} When the inquiry exists but does not belong to the requesting
 *   customer (403 Forbidden)
 */
export async function get__shoppingMallAiBackend_customer_inquiries_$inquiryId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendInquiry> {
  const { customer, inquiryId } = props;
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findFirst({
      where: {
        id: inquiryId,
        deleted_at: null,
      },
    });
  if (!inquiry) throw new Error("Inquiry not found");
  if (!inquiry.customer_id || inquiry.customer_id !== customer.id) {
    throw new Error("Access forbidden");
  }
  return {
    id: inquiry.id,
    customer_id: inquiry.customer_id ?? null,
    seller_id: inquiry.seller_id ?? null,
    product_id: inquiry.product_id ?? null,
    order_id: inquiry.order_id ?? null,
    title: inquiry.title,
    body: inquiry.body,
    private: inquiry.private,
    status: inquiry.status,
    closed_at: inquiry.closed_at ? toISOStringSafe(inquiry.closed_at) : null,
    created_at: toISOStringSafe(inquiry.created_at),
    updated_at: toISOStringSafe(inquiry.updated_at),
    deleted_at: inquiry.deleted_at ? toISOStringSafe(inquiry.deleted_at) : null,
  };
}
