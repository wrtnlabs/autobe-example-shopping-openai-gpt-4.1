import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Unfavorite a product in a customer's favorite group by deleting the mapping.
 *
 * Removes the favorite-mark from a product in the customer's specified favorite
 * group/folder. This deletes the link record, i.e., the product is no longer
 * shown in the customer's favorites for the folder. If the mapping does not
 * exist or is already deleted, returns success (idempotency guaranteed). Only
 * the owner can perform this operation, enforcing correct authorization.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the operation
 * @param props.favoriteId - Globally unique identifier of the parent favorite
 *   group/folder
 * @param props.productId - Globally unique identifier of product to unfavorite
 * @returns Void
 * @throws {Error} When mapping exists and the current customer is not the owner
 */
export async function delete__shoppingMallAiBackend_customer_favorites_$favoriteId_products_$productId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, favoriteId, productId } = props;
  // 1. Look up the mapping, including the favorite to check ownership
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.findFirst({
      where: {
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_product_id: productId,
      },
      include: {
        favorite: true,
      },
    });
  // 2. If mapping does not exist, nothing to do (idempotency)
  if (!mapping) {
    return;
  }
  // 3. Authorization: Only owner may delete
  if (mapping.favorite.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error(
      "Unauthorized: Only the owner can remove this product from the favorite group.",
    );
  }
  // 4. Delete the mapping (hard delete, no soft delete available)
  await MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.delete({
    where: {
      shopping_mall_ai_backend_favorite_id_shopping_mall_ai_backend_product_id:
        {
          shopping_mall_ai_backend_favorite_id: favoriteId,
          shopping_mall_ai_backend_product_id: productId,
        },
    },
  });
}
