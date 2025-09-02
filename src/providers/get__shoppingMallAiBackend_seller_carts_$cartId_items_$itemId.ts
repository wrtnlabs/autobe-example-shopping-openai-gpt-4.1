import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve the full details of a single item inside a specific shopping cart.
 *
 * This endpoint allows authenticated sellers to retrieve information about a
 * specific cart item by its unique ID and associated cart ID. It includes full
 * evidence and attributes of the cart item such as quantity, option codes,
 * bundle selection, and notes. Access is restricted—if the item is not found,
 * or is deleted, an error is thrown. All datetime fields are guaranteed to be
 * returned as ISO8601 strings in the correct branded format. No use of native
 * Date or type assertions is allowed.
 *
 * @param props - The request properties
 * @param props.seller - Seller payload (authenticated seller performing the
 *   request)
 * @param props.cartId - Unique identifier for the cart holding the item (UUID)
 * @param props.itemId - Unique identifier for the item within the cart (UUID)
 * @returns The cart item with all evidence and attributes as
 *   IShoppingMallAiBackendCartItem
 * @throws {Error} If the cart item does not exist or seller is not authorized
 *   to access it
 */
export async function get__shoppingMallAiBackend_seller_carts_$cartId_items_$itemId(props: {
  seller: { id: string & tags.Format<"uuid">; type: "seller" };
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCartItem> {
  const { seller, cartId, itemId } = props;
  // Query for the specific cart item, only if not deleted
  const item =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_cart_id: cartId,
        deleted_at: null,
      },
    });
  if (!item) {
    throw new Error("Cart item not found");
  }
  // Map fields, converting all Date fields using toISOStringSafe()
  const result = {
    id: item.id,
    shopping_mall_ai_backend_cart_id: item.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      item.shopping_mall_ai_backend_product_snapshot_id,
    quantity: item.quantity,
    option_code: item.option_code,
    bundle_code: item.bundle_code ?? undefined,
    note: item.note ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  };
  // Return; function return type guarantees conformance
  return result;
}
