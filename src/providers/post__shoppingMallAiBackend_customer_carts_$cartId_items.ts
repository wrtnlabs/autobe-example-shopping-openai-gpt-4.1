import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Adds an item to a user's cart by cartId, specifying product snapshot and
 * quantity.
 *
 * This operation adds a new item to a customer's shopping cart, identified by
 * cartId. It allows the user to specify a product snapshot, quantity, option
 * selections, and optional bundle for precise item tracking. The operation is
 * tightly integrated with the shopping_mall_ai_backend_carts and
 * shopping_mall_ai_backend_cart_items tables, referencing the cart context and
 * cart item specifics.
 *
 * Upon invocation, a new cart item is created for the target cart, with all
 * relevant audit/evidence preserved according to business requirements. All
 * input fields are validated for business rules (inventory, unique
 * product+option per cart, etc.), and the operation is subject to real-time
 * business constraints, such as promotion or stacking logic affecting the cart
 * state. Security checks ensure that only the cart owner (or session-bound
 * guest) may perform this action, and failures (inventory constraint or invalid
 * request) result in descriptive error codes.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer attempting to add an item
 * @param props.cartId - Target cart's unique identifier (UUID)
 * @param props.body - The cart item creation data (product snapshot, quantity,
 *   options, bundle, note)
 * @returns Information about the newly created cart item within the cart
 * @throws {Error} If the customer does not own the cart, or cart does not
 *   exist/deleted
 * @throws {Error} If other business rules prevent adding the item
 */
export async function post__shoppingMallAiBackend_customer_carts_$cartId_items(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCartItem.ICreate;
}): Promise<IShoppingMallAiBackendCartItem> {
  const { customer, cartId, body } = props;

  // Authorization: the customer must own this cart and cart must not be deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      shopping_mall_ai_backend_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!cart) throw new Error("Forbidden: Not your cart or cart deleted");

  // Business rule: Ensure no duplicate item with same (cart, product_snapshot, option_code, bundle_code)
  const existingItem =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        shopping_mall_ai_backend_cart_id: cartId,
        shopping_mall_ai_backend_product_snapshot_id:
          body.shopping_mall_ai_backend_product_snapshot_id,
        option_code: body.option_code,
        bundle_code: body.bundle_code ?? null,
        deleted_at: null,
      },
    });
  if (existingItem) {
    throw new Error(
      "Item with given product and options already exists in the cart",
    );
  }

  // Create new cart item
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_cart_id: cartId,
        shopping_mall_ai_backend_product_snapshot_id:
          body.shopping_mall_ai_backend_product_snapshot_id,
        quantity: body.quantity,
        option_code: body.option_code,
        bundle_code: body.bundle_code ?? null,
        note: body.note ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_ai_backend_cart_id: created.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      created.shopping_mall_ai_backend_product_snapshot_id,
    quantity: created.quantity,
    option_code: created.option_code,
    bundle_code: created.bundle_code,
    note: created.note,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
