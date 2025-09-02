import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a product tag by its unique identifier.
 *
 * This function retrieves the details of a specific product tag from the
 * shopping_mall_ai_backend_product_tags table using its unique ID. Only
 * non-deleted (active) tags are returned. Soft-deleted tags (deleted_at not
 * null) and non-existent tags result in an error. This operation is restricted
 * to authenticated admin users (catalog management privileges).
 *
 * @param props - The function props
 * @param props.admin - The authenticated admin making the request (must have a
 *   valid, active admin payload)
 * @param props.tagId - Unique identifier of the product tag to retrieve (UUID)
 * @returns The product tag details, including tag name, code, and audit fields
 * @throws {Error} If the tag is not found or has been soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_productTags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductTag> {
  const { tagId } = props;
  // Only allow non-deleted tags
  const tag =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findFirstOrThrow(
      {
        where: { id: tagId, deleted_at: null },
      },
    );
  return {
    id: tag.id,
    tag_name: tag.tag_name,
    tag_code: tag.tag_code,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
    // Convert deleted_at to ISO if present, else null/undefined for API contract
    ...(tag.deleted_at !== undefined && tag.deleted_at !== null
      ? { deleted_at: toISOStringSafe(tag.deleted_at) }
      : {}),
  };
}
