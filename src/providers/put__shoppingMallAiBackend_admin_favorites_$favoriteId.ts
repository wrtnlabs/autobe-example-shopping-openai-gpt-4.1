import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates specific fields (metadata or folder assignment) of an existing
 * favorite belonging to the authenticated admin.
 *
 * Allows updating the organization folder or snapshot title for a favorite.
 * Enforces that only an admin's own, active (not soft deleted) favorite can be
 * updated. All changes are audit-tracked and evidence is preserved as per
 * business platform policy.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.favoriteId - Unique identifier of the favorite to update
 * @param props.body - Partial update payload (folder assignment, title
 *   snapshot)
 * @returns The updated favorite entity, including timestamps and all evidence
 *   fields
 * @throws {Error} When the favorite is not found, soft deleted, or not owned by
 *   the admin
 */
export async function put__shoppingMallAiBackend_admin_favorites_$favoriteId(props: {
  admin: AdminPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavorite.IUpdate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { admin, favoriteId, body } = props;

  // 1. Find the favorite (ownership and not soft deleted)
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: admin.id,
      },
    });
  if (!favorite)
    throw new Error("Favorite not found or not owned by this admin");

  // 2. Update allowed fields only
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

  // 3. Return DTO type (convert Date fields to branded string types)
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
