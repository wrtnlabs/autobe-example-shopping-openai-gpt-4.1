import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new favorite for the authenticated user (admin context).
 *
 * This operation allows an admin to create a favorite (bookmark) for a product,
 * address, or inquiry on behalf of a customer. The admin must specify the
 * target type, target ID (optional depending on favorite type), and optionally
 * associate the favorite with a user-defined folder for organizational
 * purposes. Uniqueness is strictly enforced on (customer, target_type,
 * target_id_snapshot), preventing duplicate favorites on the same item per
 * user.
 *
 * All audit metadata (timestamps, evidence) and snapshot fields from the
 * shopping_mall_ai_backend_favorites model are returned. If a favorite with the
 * given combination already exists (and is not soft-deleted), this function
 * will throw an error to conform to API contract and business rules.
 *
 * @param props - Request context and input data
 * @param props.admin - The authenticated admin creating a favorite
 *   (authorization already validated)
 * @param props.body - The favorite creation data (customer_id, target type,
 *   target_id, folder, etc)
 * @returns The newly created favorite entity, including all audit and evidence
 *   fields
 * @throws {Error} If a favorite with the same (customer, target_type,
 *   target_id_snapshot) already exists and is not deleted
 */
export async function post__shoppingMallAiBackend_admin_favorites(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendFavorite.ICreate;
}): Promise<IShoppingMallAiBackendFavorite> {
  const { body } = props;

  // Enforce unique constraint: only one favorite per (customer, target_type, target_id_snapshot, deleted_at: null)
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id,
        target_type: body.target_type,
        target_id_snapshot: body.target_id_snapshot ?? null,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error("Duplicate favorite for this target already exists");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // Create the favorite with all required and optional fields
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.create({
      data: {
        id,
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id,
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

  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_favorite_folder_id:
      created.shopping_mall_ai_backend_favorite_folder_id,
    title_snapshot: created.title_snapshot,
    target_type: created.target_type,
    target_id_snapshot: created.target_id_snapshot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
