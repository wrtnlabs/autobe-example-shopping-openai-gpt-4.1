import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Create a new shopping cart for a customer or guest session.
 *
 * Adds a new shopping cart to the ShoppingMallAiBackend system for a customer
 * or guest session. Accepts cart metadata and associations (e.g., customer,
 * session, cart_token, note, status, expiry fields) and enforces uniqueness of
 * cart_token. Timestamps and id are system-generated. All creation events are
 * logged for audit, and the resulting response contains all cart properties and
 * associations. Requires authenticated customer.
 *
 * @param props - Function props
 * @param props.customer - The authenticated customer payload (required)
 * @param props.body - Request body with cart fields (token, status,
 *   [optionals])
 * @returns The newly created cart object with all properties populated
 * @throws {Error} If cart_token is not unique or DB/validation error occurs
 */
export async function post__shoppingMallAiBackend_customer_carts(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendCart.ICreate;
}): Promise<IShoppingMallAiBackendCart> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_carts.create({
    data: {
      id: v4(),
      shopping_mall_ai_backend_customer_id:
        body.shopping_mall_ai_backend_customer_id ?? null,
      shopping_mall_ai_backend_customer_session_id:
        body.shopping_mall_ai_backend_customer_session_id ?? null,
      cart_token: body.cart_token,
      status: body.status,
      expires_at: body.expires_at ?? null,
      last_merged_at: body.last_merged_at ?? null,
      note: body.note ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      created.shopping_mall_ai_backend_customer_session_id,
    cart_token: created.cart_token,
    status: created.status,
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    last_merged_at: created.last_merged_at
      ? toISOStringSafe(created.last_merged_at)
      : null,
    note: created.note ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
