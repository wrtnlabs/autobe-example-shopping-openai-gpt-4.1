import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Creates a new favorite for the authenticated seller.
 *
 * This operation allows the logged-in seller to favorite a specific target
 * (product, address, inquiry, etc.) by specifying the type and snapshot target
 * ID. Optionally, the favorite can be grouped into a user folder. Uniqueness is
 * strictly enforced per (seller/customer, target_type, target_id); attempts to
 * create a duplicate favorite will throw an error. All timestamps are ISO-8601
 * date-time strings and all UUIDs are branded as string & tags.Format<'uuid'>.
 * No Date or 'as' type assertions are ever used.
 *
 * @param props - Provider props containing:
 *
 *   - Seller: The authenticated SellerPayload (authorizes and determines
 *       customer_id linkage)
 *   - Body: The favorite creation parameters (type, snapshot, folder)
 *
 * @returns The newly created favorite as IShoppingMallAiBackendFavorite, with
 *   system fields populated
 * @throws {Error} If the (customer, target_type, target_id) favorite already
 *   exists and is not deleted
 */
export async function post__shoppingMallAiBackend_seller_favorites(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendFavorite.ICreate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { seller, body } = props;

  // 1. Uniqueness enforcement: prevent duplicate favorites for same seller/target/type/id (excluding deleted)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        shopping_mall_ai_backend_customer_id: seller.id,
        target_type: body.target_type,
        target_id_snapshot: body.target_id_snapshot ?? null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing) {
    throw new Error("Favorite for this target already exists.");
  }

  // 2. Prepare timestamps (ISO strings) and uuid
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const uuid: string & tags.Format<"uuid"> = v4();

  // 3. Insert new favorite with validated fields. Only allowed nulls, no undefined or missing fields.
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.create({
      data: {
        id: uuid,
        shopping_mall_ai_backend_customer_id: seller.id,
        shopping_mall_ai_backend_favorite_folder_id:
          body.shopping_mall_ai_backend_favorite_folder_id !== undefined
            ? body.shopping_mall_ai_backend_favorite_folder_id
            : null,
        title_snapshot:
          body.title_snapshot !== undefined ? body.title_snapshot : null,
        target_type: body.target_type,
        target_id_snapshot:
          body.target_id_snapshot !== undefined
            ? body.target_id_snapshot
            : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 4. Return DTO following interface rules - all date fields as strings, all nullables passed directly (never omitted), no 'as' assertions
  return {
    id: favorite.id,
    shopping_mall_ai_backend_customer_id:
      favorite.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_favorite_folder_id:
      favorite.shopping_mall_ai_backend_favorite_folder_id,
    title_snapshot: favorite.title_snapshot,
    target_type: favorite.target_type,
    target_id_snapshot: favorite.target_id_snapshot,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at:
      favorite.deleted_at !== undefined && favorite.deleted_at !== null
        ? toISOStringSafe(favorite.deleted_at)
        : null,
  };
}
