import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates specific fields of an existing favorite belonging to the
 * authenticated seller (user).
 *
 * Allows updating the favorite's organization folder and/or snapshot title,
 * enforcing strict ownership and soft-delete safeguards. Only favorites that
 * are owned by the current seller and are not soft-deleted may be updated. All
 * business and audit invariants per schema are preserved.
 *
 * @param props - The request parameters
 * @param props.seller - The authenticated seller (authorization context)
 * @param props.favoriteId - The UUID of the favorite record to update
 * @param props.body - The updatable fields (folder id or title snapshot)
 * @returns The updated favorite entity with evidence fields as required
 * @throws {Error} If the favorite is not found, has been soft-deleted, or is
 *   not owned by this seller
 * @throws {Error} If the update violates uniqueness or other platform
 *   constraints
 */
export async function put__shoppingMallAiBackend_seller_favorites_$favoriteId(props: {
  seller: SellerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavorite.IUpdate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { seller, favoriteId, body } = props;

  // 1. Find the favorite record by id and verify it's not soft-deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite not found");
  }

  // 2. Enforce ownership: seller.id must match favorite.shopping_mall_ai_backend_customer_id
  if (favorite.shopping_mall_ai_backend_customer_id !== seller.id) {
    throw new Error("You do not have permission to update this favorite");
  }

  // 3. Update only allowed fields, set updated_at to now (string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.update({
      where: { id: favoriteId },
      data: {
        shopping_mall_ai_backend_favorite_folder_id:
          body.shopping_mall_ai_backend_favorite_folder_id ?? undefined,
        title_snapshot: body.title_snapshot ?? undefined,
        updated_at: now,
      },
    });

  // 4. Return mapped result as IShoppingMallAiBackendFavorite, converting all dates appropriately
  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_favorite_folder_id:
      updated.shopping_mall_ai_backend_favorite_folder_id ?? null,
    title_snapshot: updated.title_snapshot ?? null,
    target_type: updated.target_type,
    target_id_snapshot: updated.target_id_snapshot ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
