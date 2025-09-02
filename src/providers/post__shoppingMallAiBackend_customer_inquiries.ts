import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new inquiry (QnA/support ticket) for a customer.
 *
 * This endpoint allows an authenticated customer to create a new inquiry. The
 * created inquiry is owned by the authenticated customer and includes all
 * relevant metadata and audit fields. Only the authenticated customer's id is
 * set as the owner (customer_id); input from the body is ignored for ownership
 * enforcement.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.body - Inquiry creation values (title, body, privacy flag,
 *   status, references)
 * @returns The persisted inquiry object with all business and audit fields
 *   populated
 * @throws {Error} When inquiry creation fails or on internal error
 */
export async function post__shoppingMallAiBackend_customer_inquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendInquiry.ICreate;
}): Promise<IShoppingMallAiBackendInquiry> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.create({
      data: {
        id,
        customer_id: props.customer.id,
        seller_id: props.body.seller_id ?? null,
        product_id: props.body.product_id ?? null,
        order_id: props.body.order_id ?? null,
        title: props.body.title,
        body: props.body.body,
        private: props.body.private,
        status: props.body.status,
        closed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    customer_id: created.customer_id ?? null,
    seller_id: created.seller_id ?? null,
    product_id: created.product_id ?? null,
    order_id: created.order_id ?? null,
    title: created.title,
    body: created.body,
    private: created.private,
    status: created.status,
    closed_at: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
