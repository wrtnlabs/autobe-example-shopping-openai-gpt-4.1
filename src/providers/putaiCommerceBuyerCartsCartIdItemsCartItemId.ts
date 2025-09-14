import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update a specific shopping cart item (ai_commerce_cart_items) for a buyer.
 *
 * Buyers can update a cart item's variant and quantity, and replace option
 * selections. Only the owner/active cart/item may perform this operation.
 * Fields not present in the payload are left unchanged. Option array is
 * replaced entirely if provided (null clears all options).
 *
 * @param props - Operation properties
 * @param props.buyer - The authenticated buyer performing the update
 * @param props.cartId - UUID of the owning cart
 * @param props.cartItemId - UUID of the cart item to update
 * @param props.body - Update payload: { variant_id, quantity, options }
 * @returns The updated cart item, including current options
 * @throws {Error} If cart/item does not exist, is not owned by buyer, is
 *   soft-deleted, or business rules violated
 */
export async function putaiCommerceBuyerCartsCartIdItemsCartItemId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItem.IUpdate;
}): Promise<IAiCommerceCartItem> {
  const { buyer, cartId, cartItemId, body } = props;
  // Step 1: Validate active cart and ownership
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
      buyer_id: buyer.id,
    },
  });
  if (!cart)
    throw new Error("Cart not found, not active, or does not belong to buyer");
  // Step 2: Validate active cart item in the cart
  const cartItem = await MyGlobal.prisma.ai_commerce_cart_items.findFirst({
    where: {
      id: cartItemId,
      cart_id: cartId,
      deleted_at: null,
    },
  });
  if (!cartItem)
    throw new Error("Cart item not found, not in cart, or deleted");
  // Step 3: Apply cart item updates
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_cart_items.update({
    where: { id: cartItemId },
    data: {
      updated_at: now,
      ...(body.variant_id !== undefined && { variant_id: body.variant_id }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
    },
  });
  // Step 4: If options array provided, replace all options
  if (body.options !== undefined) {
    await MyGlobal.prisma.ai_commerce_cart_item_options.deleteMany({
      where: { cart_item_id: cartItemId },
    });
    if (
      body.options !== null &&
      Array.isArray(body.options) &&
      body.options.length > 0
    ) {
      const nowOpt = toISOStringSafe(new Date());
      for (const opt of body.options) {
        await MyGlobal.prisma.ai_commerce_cart_item_options.create({
          data: {
            id: v4(),
            cart_item_id: cartItemId,
            option_name: opt.option_name,
            option_value: opt.option_value,
            created_at: nowOpt,
          },
        });
      }
    }
  }
  // Step 5: Query back latest item and options for output
  const updated = await MyGlobal.prisma.ai_commerce_cart_items.findFirst({
    where: { id: cartItemId },
    include: { ai_commerce_cart_item_options: true },
  });
  if (!updated) throw new Error("Cart item not found after update");
  const optionsArray = Array.isArray(updated.ai_commerce_cart_item_options)
    ? updated.ai_commerce_cart_item_options.map((opt) => ({
        id: opt.id,
        cart_item_id: opt.cart_item_id,
        option_name: opt.option_name,
        option_value: opt.option_value,
        created_at: toISOStringSafe(opt.created_at),
      }))
    : undefined;
  // Step 6: Return typed output, with null vs undefined for optionals/nullable per DTO
  return {
    id: updated.id,
    cart_id: updated.cart_id,
    product_id: updated.product_id,
    variant_id: updated.variant_id === null ? null : updated.variant_id, // nullable/optional
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    item_total: updated.item_total,
    added_at: toISOStringSafe(updated.added_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    options: optionsArray?.length ? optionsArray : undefined,
  };
}
