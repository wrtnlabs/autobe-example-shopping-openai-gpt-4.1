import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a shopping cart by unique cartId (admin privileged).
 *
 * Allows an authenticated admin to access all attributes, metadata, and status
 * of any cart, regardless of ownership. Ensures proper auditing and restricts
 * to non-deleted carts by default.
 *
 * @param props - Request properties
 * @param props.admin - JWT-authenticated admin payload (authorization context)
 * @param props.cartId - Unique identifier of the requested cart (UUID)
 * @returns The full business metadata record for the requested cart, with all
 *   relations and timestamps formatted.
 * @throws {Error} If the cart does not exist or is soft-deleted (not found)
 */
export async function get__shoppingMallAiBackend_admin_carts_$cartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCart> {
  const { cartId } = props;

  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_ai_backend_customer_id: true,
      shopping_mall_ai_backend_customer_session_id: true,
      cart_token: true,
      status: true,
      expires_at: true,
      last_merged_at: true,
      note: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!cart) {
    throw new Error("Cart not found");
  }

  return {
    id: cart.id,
    shopping_mall_ai_backend_customer_id:
      cart.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      cart.shopping_mall_ai_backend_customer_session_id,
    cart_token: cart.cart_token,
    status: cart.status,
    expires_at: cart.expires_at ? toISOStringSafe(cart.expires_at) : null,
    last_merged_at: cart.last_merged_at
      ? toISOStringSafe(cart.last_merged_at)
      : null,
    note: cart.note ?? null,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
  };
}
