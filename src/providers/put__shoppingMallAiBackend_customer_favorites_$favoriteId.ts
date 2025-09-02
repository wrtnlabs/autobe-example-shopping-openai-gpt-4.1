import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update an existing favorite's metadata or folder assignment.
 *
 * Updates specific fields of an existing favorite belonging to the
 * authenticated user. Usually used for moving a favorite to a different folder,
 * renaming the snapshot title, or updating auxiliary metadata. The operation
 * enforces ownership and active status—only non-deleted, user-owned favorites
 * may be updated. All change audits and evidence fields are maintained per the
 * shopping_mall_ai_backend_favorites schema.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the update
 * @param props.favoriteId - The unique identifier of the favorite to update
 * @param props.body - Fields to update (e.g., folder ID, snapshot title)
 * @returns The updated favorite entity with new timestamps and field values
 * @throws {Error} When favorite does not exist, is deleted, or is not owned by
 *   the user
 */
export async function put__shoppingMallAiBackend_customer_favorites_$favoriteId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavorite.IUpdate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { customer, favoriteId, body } = props;

  // Step 1: Find favorite (must be owned by customer, not soft deleted)
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error(`Favorite not found or access denied`);
  }

  // Step 2: Update permitted fields and updated_at
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.update({
      where: { id: favoriteId },
      data: {
        shopping_mall_ai_backend_favorite_folder_id:
          body.shopping_mall_ai_backend_favorite_folder_id ?? undefined,
        title_snapshot: body.title_snapshot ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 3: Return model as IShoppingMallAiBackendFavorite
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
