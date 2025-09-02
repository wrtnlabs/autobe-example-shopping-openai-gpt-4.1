import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves details for a specific favorited product under the given favorite
 * folder or group.
 *
 * This operation enforces that the requesting customer owns the favorite group
 * (folder), and that the productId is actually linked to the favorite. Returns
 * detailed summary including favorited timestamp and relationship mapping.
 * Throws precise error if not found or permission denied.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.favoriteId - Globally unique identifier of the parent favorite
 *   group/folder
 * @param props.productId - Globally unique identifier of the favorited product
 * @returns The favorited product—relationship mapping object including IDs and
 *   favorited timestamp
 * @throws {Error} When favorite-product mapping does not exist, favorite group
 *   does not exist, or favorite is not owned by the requesting customer
 */
export async function get__shoppingMallAiBackend_customer_favorites_$favoriteId_products_$productId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavoriteProduct> {
  const { customer, favoriteId, productId } = props;

  // 1. Find the favorite-product mapping for this favorite and product
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.findFirst({
      where: {
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_product_id: productId,
      },
    });
  if (!mapping) {
    throw new Error("Favorite product mapping not found");
  }

  // 2. Fetch the favorite group and validate ownership
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: { id: favoriteId },
    });
  if (!favorite) {
    throw new Error("Favorite group not found");
  }
  if (favorite.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this favorite group.");
  }

  // 3. Return mapped result with ISO8601-encoded created_at
  return {
    id: mapping.id,
    shopping_mall_ai_backend_favorite_id:
      mapping.shopping_mall_ai_backend_favorite_id,
    shopping_mall_ai_backend_product_id:
      mapping.shopping_mall_ai_backend_product_id,
    created_at: toISOStringSafe(mapping.created_at),
  };
}
