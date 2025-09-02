import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Updates fields of a cart item by itemId within cartId
 * (shopping_mall_ai_backend_cart_items).
 *
 * This operation updates an existing item in a customer's shopping cart,
 * identified by both cartId and itemId. It allows modification of quantity,
 * option selection, bundle, and note fields on the target cart item. The logic
 * centrally checks both the cart's existence and ownership, and the item's
 * existence in the cart. It enforces update eligibility and performs immutable,
 * type-safe updates. The updated_at field is always bumped, and all date-times
 * are strictly formatted as ISO8601 strings. Any violation of cart/item
 * ownership, status, or business constraints results in an error. No native
 * Date or type assertions are used.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.cartId - UUID of the cart to update
 * @param props.itemId - UUID of the item to update
 * @param props.body - The fields to update for the cart item (quantity,
 *   option_code, bundle_code, note)
 * @returns The updated cart item, with all date fields as ISO8601 strings
 * @throws {Error} When the cart is not found, not owned by the user, is
 *   deleted, or not active
 * @throws {Error} When the cart item is not found, not in the cart, or already
 *   deleted
 */
export async function put__shoppingMallAiBackend_customer_carts_$cartId_items_$itemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCartItem.IUpdate;
}): Promise<IShoppingMallAiBackendCartItem> {
  const { customer, cartId, itemId, body } = props;

  // 1. Authorization: Cart must exist, not deleted, and match customer
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_ai_backend_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!cart) throw new Error("Unauthorized or cart not found");
  // Optional: Only allow update if cart.status is 'active' (guards against edits to submitted/abandoned carts)
  if (cart.status !== "active") throw new Error("Cart is not editable");

  // 2. Validate item exists, belongs to cart, not deleted
  const item =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_cart_id: cartId,
        deleted_at: null,
      },
    });
  if (!item) throw new Error("Cart item not found or not in cart");

  // 3. Update allowed fields (only those provided); always update updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.update({
      where: { id: itemId },
      data: {
        quantity: body.quantity ?? undefined,
        option_code: body.option_code ?? undefined,
        bundle_code: body.bundle_code ?? undefined,
        note: body.note ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_cart_id: updated.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      updated.shopping_mall_ai_backend_product_snapshot_id,
    quantity: updated.quantity,
    option_code: updated.option_code,
    bundle_code: updated.bundle_code ?? null,
    note: updated.note ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
