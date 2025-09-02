import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a customer's favorite folder for personalized organization needs.
 *
 * This endpoint allows an authenticated customer to update the name or
 * description of a specific favorite folder they own.
 *
 * - Validates folder existence and ownership by customer.
 * - Ensures updated folder name is unique among the customer's active folders
 *   (not deleted).
 * - Updates only the provided fields (name/description), and sets updated_at
 *   (handled by Prisma @updatedAt).
 * - Returns the updated favorite folder entity with all required fields and
 *   proper ISO date formatting.
 * - Throws error if folder is not found, not owned by customer, deleted, or if
 *   name uniqueness is violated.
 *
 * @param props - Update request properties
 * @param props.customer - Authenticated customer making the request
 * @param props.favoriteFolderId - The unique identifier of the favorite folder
 *   to update
 * @param props.body - Data to update for the favorite folder, including the new
 *   name or description
 * @returns The updated favorite folder entity
 * @throws {Error} When folder does not exist, is not owned by customer, is
 *   deleted, or name is duplicated
 */
export async function put__shoppingMallAiBackend_customer_favoriteFolders_$favoriteFolderId(props: {
  customer: CustomerPayload;
  favoriteFolderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteFolder.IUpdate;
}): Promise<IShoppingMallAiBackendFavoriteFolder> {
  const { customer, favoriteFolderId, body } = props;

  // 1. Fetch folder for update, verifying ownership and not deleted
  const folder =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.findFirst({
      where: {
        id: favoriteFolderId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!folder) {
    throw new Error("Folder not found or not authorized");
  }

  // 2. If new name is requested AND changed, check uniqueness per customer
  if (
    body.name !== undefined &&
    body.name !== null &&
    body.name !== folder.name
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.findFirst(
        {
          where: {
            shopping_mall_ai_backend_customer_id: customer.id,
            name: body.name,
            deleted_at: null,
            NOT: { id: favoriteFolderId },
          },
        },
      );
    if (duplicate) {
      throw new Error("Folder name already in use");
    }
  }

  // 3. Update favorite folder with provided fields only
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.update({
      where: { id: favoriteFolderId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        // updated_at: handled by Prisma @updatedAt
      },
    });

  // 4. Format and return updated record
  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id as string &
        tags.Format<"uuid">,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
