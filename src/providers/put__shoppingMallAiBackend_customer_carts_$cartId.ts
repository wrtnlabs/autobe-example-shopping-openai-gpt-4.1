import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update shopping cart metadata or status for a given cartId.
 *
 * This endpoint allows clients to modify the session association, customer,
 * note, and status fields for a given cart as the owning customer. Updates are
 * only permitted if the cart exists, is not soft-deleted, and is owned by the
 * authenticated customer. All request fields are optional partials; only fields
 * present in the request body will be updated. Returns the updated cart object
 * with all fields consistent with API structures.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer's JWT payload
 * @param props.cartId - Unique identifier of the cart to update (UUID)
 * @param props.body - Fields to update, all optional/partial
 * @returns The updated cart object reflecting all changes
 * @throws {Error} When cart is not found, soft-deleted, or not owned by the
 *   customer
 */
export async function put__shoppingMallAiBackend_customer_carts_$cartId(props: {
  customer: { id: string & tags.Format<"uuid">; type: "customer" };
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCart.IUpdate;
}): Promise<IShoppingMallAiBackendCart> {
  const { cartId, customer, body } = props;

  // 1. Fetch the cart by id, skipping soft-deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: { id: cartId, deleted_at: null },
  });
  if (!cart) throw new Error("Cart not found or has been deleted");

  // 2. Ownership enforcement: Only owner can update
  if (cart.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this cart");
  }

  // 3. Prepare update data, omitting missing fields
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: {
      shopping_mall_ai_backend_customer_id:
        body.shopping_mall_ai_backend_customer_id ?? undefined,
      shopping_mall_ai_backend_customer_session_id:
        body.shopping_mall_ai_backend_customer_session_id ?? undefined,
      cart_token: body.cart_token ?? undefined,
      status: body.status ?? undefined,
      expires_at:
        body.expires_at === undefined
          ? undefined
          : body.expires_at === null
            ? null
            : toISOStringSafe(body.expires_at),
      last_merged_at:
        body.last_merged_at === undefined
          ? undefined
          : body.last_merged_at === null
            ? null
            : toISOStringSafe(body.last_merged_at),
      note: body.note ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Return the updated cart, converting Date values properly
  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      updated.shopping_mall_ai_backend_customer_session_id,
    cart_token: updated.cart_token,
    status: updated.status,
    expires_at:
      updated.expires_at === null ? null : toISOStringSafe(updated.expires_at),
    last_merged_at:
      updated.last_merged_at === null
        ? null
        : toISOStringSafe(updated.last_merged_at),
    note: updated.note,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
