import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new product tag for catalog classification and filtering.
 *
 * This operation allows administrators to create new product tags, used for
 * classifying, filtering, and searching products in the catalog. Enforces
 * uniqueness for tag_code among active tags. Sets audit timestamps
 * automatically.
 *
 * Only authenticated admins may invoke this endpoint. Returns the created tag
 * object, including audit fields.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator payload
 * @param props.body - Tag creation input (tag_name and unique tag_code)
 * @returns The newly created product tag object
 * @throws {Error} If a tag with the given tag_code already exists among
 *   non-deleted tags
 */
export async function post__shoppingMallAiBackend_admin_productTags(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductTag.ICreate;
}): Promise<IShoppingMallAiBackendProductTag> {
  const { admin, body } = props;

  // 1. Enforce uniqueness: tag_code must be unique among non-deleted tags
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findFirst({
      where: { tag_code: body.tag_code, deleted_at: null },
    });
  if (exists) {
    throw new Error("A product tag with the same tag_code already exists.");
  }

  // 2. Prepare id and timestamp
  const id = v4();
  const now = toISOStringSafe(new Date());

  // 3. Insert new tag
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.create({
      data: {
        id,
        tag_name: body.tag_name,
        tag_code: body.tag_code,
        created_at: now,
        updated_at: now,
      },
    });

  // 4. Map to response ensuring proper type resolutions
  return {
    id: created.id,
    tag_name: created.tag_name,
    tag_code: created.tag_code,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
