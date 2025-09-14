import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Add a new item (ai_commerce_cart_items) to a shopping cart by cartId
 * (ai_commerce_carts).
 *
 * Creates a new cart item in ai_commerce_cart_items for a specified cart (by
 * cartId). Request specifies product/variant, quantity, and option selections
 * if applicable. The operation validates product existence, inventory, cart
 * status (must be open), and merges with existing item if same
 * product/variant/options already present, incrementing quantity up to limits.
 *
 * Triggers cart-level recalculation for total quantity and status, returns the
 * newly created/merged cart item as confirmation. Only the cart's owner (buyer)
 * or admin can add items. Audit trail, error scenarios (insufficient
 * inventory/invalid product) handled per business logic.
 *
 * @param props - Object containing all necessary parameters
 * @param props.buyer - The authenticated buyer (role payload), must own the
 *   cart
 * @param props.cartId - UUID of the cart
 * @param props.body - Request body of shape IAiCommerceCartItem.ICreate
 *   (product/variant/options/quantity)
 * @returns The newly added (or merged/updated) cart item as IAiCommerceCartItem
 * @throws {Error} If cart not found or unauthorized, product/variant
 *   unavailable, or insufficient inventory for operation
 */
export async function postaiCommerceBuyerCartsCartIdItems(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItem.ICreate;
}): Promise<IAiCommerceCartItem> {
  const { buyer, cartId, body } = props;

  // Step 1: Validate cart existence, ownership, open status, not deleted
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      buyer_id: buyer.id,
      deleted_at: null,
      status: { in: ["draft", "active"] },
    },
  });
  if (!cart)
    throw new Error(
      "Cart not found, not owned by buyer, deleted, or not editable",
    );

  // Step 2: Validate product, status, not deleted
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: body.product_id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!product) throw new Error("Product not found, deleted, or inactive");

  // Step 3: If variant_id provided, validate it, else undefined
  let variant = undefined;
  if (body.variant_id !== undefined && body.variant_id !== null) {
    variant = await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
      where: {
        id: body.variant_id,
        product_id: body.product_id,
        deleted_at: null,
        status: "active",
      },
    });
    if (!variant)
      throw new Error(
        "Variant not found, does not match product, or is unavailable",
      );
  }

  // Step 4: Determine unit price (variant if present, else product)
  const unitPrice = variant ? variant.variant_price : product.current_price;

  // Step 5: Prepare options (array, for duplicate merge/creation logic)
  const requestedOptions = Array.isArray(body.options) ? body.options : [];

  // Step 6: Find duplicate eligible cart items (identical product, variant, same options array) in this cart, not deleted
  const candidateItems = await MyGlobal.prisma.ai_commerce_cart_items.findMany({
    where: {
      cart_id: cartId,
      product_id: body.product_id,
      deleted_at: null,
    },
    include: { ai_commerce_cart_item_options: true },
  });

  // Helper: Determine if two arrays of options are deeply equal
  function optionsMatch(aOpts: any[], bOpts: any[]): boolean {
    if (aOpts.length !== bOpts.length) return false;
    for (let i = 0; i < aOpts.length; ++i) {
      if (
        aOpts[i]?.option_name !== bOpts[i]?.option_name ||
        aOpts[i]?.option_value !== bOpts[i]?.option_value
      )
        return false;
    }
    return true;
  }

  let duplicateItem = undefined;
  for (const item of candidateItems) {
    const itemOptions = Array.isArray(item.ai_commerce_cart_item_options)
      ? item.ai_commerce_cart_item_options
      : [];
    // Variant: both null/undefined, or ids are same
    const variantMatch = variant
      ? item.variant_id === variant.id
      : !item.variant_id;
    if (variantMatch && optionsMatch(itemOptions, requestedOptions)) {
      duplicateItem = item;
      break;
    }
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  let newOrMergedItem;

  // Step 7: Merge or Insert logic, enforce inventory constraints
  if (duplicateItem) {
    // Merge: increment quantity, ensure max inventory
    const proposedQty = duplicateItem.quantity + body.quantity;
    const maxAvailable = variant
      ? variant.inventory_quantity
      : product.inventory_quantity;
    if (proposedQty > maxAvailable)
      throw new Error("Insufficient inventory for merged quantity");
    newOrMergedItem = await MyGlobal.prisma.ai_commerce_cart_items.update({
      where: { id: duplicateItem.id },
      data: {
        quantity: proposedQty,
        unit_price: unitPrice,
        item_total: unitPrice * proposedQty,
        updated_at: now,
      },
      include: { ai_commerce_cart_item_options: true },
    });
  } else {
    // Insert new row, check inventory
    const maxAvailable = variant
      ? variant.inventory_quantity
      : product.inventory_quantity;
    if (body.quantity > maxAvailable)
      throw new Error("Insufficient inventory to add item");
    const baseCartItem = await MyGlobal.prisma.ai_commerce_cart_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        cart_id: cartId,
        product_id: body.product_id,
        variant_id: variant ? variant.id : null,
        quantity: body.quantity,
        unit_price: unitPrice,
        item_total: unitPrice * body.quantity,
        added_at: now,
        updated_at: now,
      },
      include: { ai_commerce_cart_item_options: true },
    });

    // If there are options, create ai_commerce_cart_item_options rows atomically
    let finalItem = baseCartItem;
    if (requestedOptions.length > 0) {
      for (const opt of requestedOptions) {
        await MyGlobal.prisma.ai_commerce_cart_item_options.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            cart_item_id: baseCartItem.id,
            option_name: opt.option_name,
            option_value: opt.option_value,
            created_at: now,
          },
        });
      }
      // Re-fetch to get options for full response
      finalItem = await MyGlobal.prisma.ai_commerce_cart_items.findUnique({
        where: { id: baseCartItem.id },
        include: { ai_commerce_cart_item_options: true },
      });
    }
    newOrMergedItem = finalItem;
  }

  // Step 8: Recalculate and update cart total_quantity and updated_at
  const currentCartItems =
    await MyGlobal.prisma.ai_commerce_cart_items.findMany({
      where: { cart_id: cartId, deleted_at: null },
    });
  const cartTotalQuantity = currentCartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  await MyGlobal.prisma.ai_commerce_carts.update({
    where: { id: cartId },
    data: {
      total_quantity: cartTotalQuantity,
      updated_at: now,
    },
  });

  // Step 9: Compose IAiCommerceCartItem result with correct mapping
  return {
    id: newOrMergedItem.id,
    cart_id: cartId,
    product_id: newOrMergedItem.product_id,
    variant_id: newOrMergedItem.variant_id ?? null,
    quantity: newOrMergedItem.quantity,
    unit_price: newOrMergedItem.unit_price,
    item_total: newOrMergedItem.item_total,
    added_at: newOrMergedItem.added_at,
    updated_at: newOrMergedItem.updated_at,
    deleted_at:
      typeof newOrMergedItem.deleted_at === "string"
        ? newOrMergedItem.deleted_at
        : undefined,
    options:
      Array.isArray(newOrMergedItem.ai_commerce_cart_item_options) &&
      newOrMergedItem.ai_commerce_cart_item_options.length > 0
        ? newOrMergedItem.ai_commerce_cart_item_options.map((opt) => ({
            id: opt.id,
            cart_item_id: opt.cart_item_id,
            option_name: opt.option_name,
            option_value: opt.option_value,
            created_at: opt.created_at,
          }))
        : undefined,
  };
}
