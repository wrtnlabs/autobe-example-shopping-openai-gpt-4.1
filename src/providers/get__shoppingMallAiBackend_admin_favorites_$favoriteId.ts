import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details about a single favorite by ID for the owner (admin context).
 *
 * Gets full detail about a single favorite belonging to any user, provided the
 * caller is a valid admin. Enforces that only non-deleted (active) favorites
 * are returned. Returns all relevant fields including target type, snapshot
 * metadata, folder association, and timestamps, with all date fields formatted
 * as ISO 8601 strings of branded type.
 *
 * @param props - Admin: Authenticated admin's payload (must be validated before
 *   calling) favoriteId: Unique identifier (UUID) of the favorite to retrieve.
 * @returns Full details of the favorite entity, including type and snapshot
 *   evidence
 * @throws {Error} If the favorite does not exist or is deleted
 */
export async function get__shoppingMallAiBackend_admin_favorites_$favoriteId(props: {
  admin: AdminPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { admin, favoriteId } = props;

  // Authorization: presence of admin payload validates the requester (already checked upstream)

  // Query for favorite with the provided id that is not soft-deleted
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
