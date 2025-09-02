import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve the full details of a single item inside a specific shopping cart.
 *
 * Allows administrators to view specific cart item details, including quantity,
 * options, bundle selection, and note, for troubleshooting or order management
 * purposes. All references and audit fields are included. Only soft non-deleted
 * items are visible; not found error is thrown for deleted or invalid items.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication context, resolved via AdminAuth
 *   decorator
 * @param props.cartId - UUID of the cart containing this item
 * @param props.itemId - UUID of the cart item to retrieve
 * @returns Full cart item details with all business fields and correct type
 *   branding
 * @throws {Error} When the specified cart item does not exist, is deleted, or
 *   not found in the given cart
 */
export async function get__shoppingMallAiBackend_admin_carts_$cartId_items_$itemId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCartItem> {
  const { admin, cartId, itemId } = props;
  const item =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_cart_id: cartId,
        deleted_at: null,
      },
    });
  if (!item) throw new Error("Cart item not found");
  return {
    id: item.id,
    shopping_mall_ai_backend_cart_id: item.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      item.shopping_mall_ai_backend_product_snapshot_id,
    quantity: item.quantity,
    option_code: item.option_code,
    bundle_code: item.bundle_code ?? null,
    note: item.note ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  };
}
