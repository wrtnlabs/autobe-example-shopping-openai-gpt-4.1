import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new favorite for the authenticated customer. Users may favorite a
 * product, address, or inquiry by specifying the target type and ID.
 * Optionally, the favorite can be placed in a folder for organizational
 * purposes. Uniqueness is enforced per customer, target_type, and
 * target_id_snapshot.
 *
 * On successful creation, returns all favorite details including audit
 * evidence, type, snapshot identifiers, and timestamps. Attempts to favorite
 * the same target more than once will result in a duplication error.
 *
 * @param props - Properties for favorite creation
 * @param props.customer - The authenticated customer payload
 * @param props.body - The favorite creation details, with target_type,
 *   target_id_snapshot, and optional folder/title
 * @returns The newly created favorite entity with full snapshot and audit
 *   fields
 * @throws {Error} If user tries to favorite the same target more than once or
 *   for another user
 */
export async function post__shoppingMallAiBackend_customer_favorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendFavorite.ICreate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { customer, body } = props;
  if (body.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Unauthorized: Cannot create favorite for another user.");
  }
  // Prevent duplicate favorites (soft-deleted don't count)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        shopping_mall_ai_backend_customer_id: customer.id,
        target_type: body.target_type,
        target_id_snapshot: body.target_id_snapshot ?? null,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error(
      "Duplicate favorite: You have already favorited this item.",
    );
  }
  // Prepare current time as ISO string
  const now = toISOStringSafe(new Date());
  // Create the favorite record
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_customer_id: customer.id,
        shopping_mall_ai_backend_favorite_folder_id:
          body.shopping_mall_ai_backend_favorite_folder_id ?? null,
        title_snapshot: body.title_snapshot ?? null,
        target_type: body.target_type,
        target_id_snapshot: body.target_id_snapshot ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Return full DTO conforming to API type
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
