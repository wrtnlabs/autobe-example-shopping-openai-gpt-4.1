import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Add a product to a customer's favorited products under a given favoriteId.
 *
 * Adds a product to the set of favorited products under a given favorite
 * folder/group for the customer. The API enforces uniqueness so that the same
 * product is favorited only once per favorite group. If already present, this
 * is a no-op. Returns the newly created (or existing) favorite product link
 * record. Authorization is enforced to ensure only the owner can create
 * favorite links in their favorited group.
 *
 * @param props - Request properties.
 * @param props.customer - The authenticated customer making this request. Must
 *   own the favorite group indicated by favoriteId.
 * @param props.favoriteId - UUID identifying the customer's favorites
 *   group/folder.
 * @param props.body - Structure containing favoriteId and productId for the new
 *   association.
 * @returns The resulting favorite product link entry after creation, as
 *   IShoppingMallAiBackendFavoriteProduct.
 * @throws {Error} If the folder does not exist or is not owned by the customer,
 *   or input mismatches URL parameter.
 */
export async function post__shoppingMallAiBackend_customer_favorites_$favoriteId_products(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteProduct.ICreate;
}): Promise<IShoppingMallAiBackendFavoriteProduct> {
  const { customer, favoriteId, body } = props;

  // Confirm the favorite group exists and is owned by the authenticated customer
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!favorite) {
    throw new Error("Favorite folder not found or not owned by customer");
  }

  // Validate that the favoriteId in URL matches the one in the body
  if (body.shopping_mall_ai_backend_favorite_id !== favoriteId) {
    throw new Error(
      "Favorite ID in body does not match the favoriteId URL parameter",
    );
  }

  // Check if the mapping already exists (idempotent behavior)
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.findFirst({
      where: {
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_product_id:
          body.shopping_mall_ai_backend_product_id,
      },
    });
  if (mapping) {
    return {
      id: mapping.id,
      shopping_mall_ai_backend_favorite_id:
        mapping.shopping_mall_ai_backend_favorite_id,
      shopping_mall_ai_backend_product_id:
        mapping.shopping_mall_ai_backend_product_id,
      created_at: toISOStringSafe(mapping.created_at),
    };
  }

  // Otherwise, create a new mapping
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.create({
      data: {
        id: v4(),
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_product_id:
          body.shopping_mall_ai_backend_product_id,
        created_at: now,
      },
    });

  return {
    id: created.id,
    shopping_mall_ai_backend_favorite_id:
      created.shopping_mall_ai_backend_favorite_id,
    shopping_mall_ai_backend_product_id:
      created.shopping_mall_ai_backend_product_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
