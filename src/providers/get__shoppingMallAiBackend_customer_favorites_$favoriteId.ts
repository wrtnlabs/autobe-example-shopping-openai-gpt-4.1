import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves detailed information about a single favorite by its unique ID,
 * ensuring that only the rightful owner can access it.
 *
 * Pulls all fields including the favorite's type, snapshot metadata, folder
 * association, and full audit evidence. Honors soft delete so only non-deleted
 * favorites are accessible. Returns an error if the favorite does not exist, is
 * deleted, or does not belong to the requesting customer.
 *
 * @param props - The request parameters
 * @param props.customer - The authenticated customer making the request
 *   (CustomerPayload)
 * @param props.favoriteId - Unique identifier for the favorite to retrieve
 * @returns - Full details for the favorite entity belonging to the customer
 *   with evidence and audit fields
 * @throws {Error} - If the favorite does not exist, is deleted, or is not owned
 *   by the customer
 */
export async function get__shoppingMallAiBackend_customer_favorites_$favoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { customer, favoriteId } = props;
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite not found or access denied");
  }
  return {
    id: favorite.id,
    shopping_mall_ai_backend_customer_id:
      favorite.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_favorite_folder_id:
      favorite.shopping_mall_ai_backend_favorite_folder_id ?? null,
    title_snapshot: favorite.title_snapshot ?? null,
    target_type: favorite.target_type,
    target_id_snapshot: favorite.target_id_snapshot ?? null,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : null,
  };
}
