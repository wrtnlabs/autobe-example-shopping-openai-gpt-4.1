import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing product tag by ID.
 *
 * This endpoint updates the details of a product tag. Editable fields include
 * tag_name and tag_code. Both fields must satisfy schema constraints, including
 * the uniqueness of tag_code. The endpoint also updates the updated_at
 * timestamp to reflect when the change was made.
 *
 * Only administrators are permitted to update product tags. The API performs
 * validation to avoid duplicate tag_codes and ensures that logically deleted
 * tags are not updated. Failure cases return informative error messages for
 * remediation. This operation is typically used together with tag creation,
 * retrieval, and deletion for comprehensive catalog management workflows.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the update
 * @param props.tagId - Unique identifier of the product tag to update
 * @param props.body - Fields for updating a product tag (name, code)
 * @returns The updated product tag record
 * @throws {Error} When the tag is not found (missing or deleted)
 * @throws {Error} When tag_code is not unique among undeleted tags
 */
export async function put__shoppingMallAiBackend_admin_productTags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductTag.IUpdate;
}): Promise<IShoppingMallAiBackendProductTag> {
  const { admin, tagId, body } = props;

  // 1. Verify target tag exists and is not deleted
  const tag =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findFirst({
      where: { id: tagId, deleted_at: null },
    });
  if (!tag) throw new Error("Product tag not found");

  // 2. If tag_code is provided and changing, ensure it's unique among undeleted tags
  if (typeof body.tag_code === "string" && body.tag_code !== tag.tag_code) {
    const codeExists =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findFirst({
        where: {
          tag_code: body.tag_code,
          deleted_at: null,
          id: { not: tagId },
        },
      });
    if (codeExists) {
      throw new Error(
        "Duplicate tag_code: That tag_code is already assigned to another undeleted product tag.",
      );
    }
  }

  // 3. Only update provided fields; always update updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.update({
      where: { id: tagId },
      data: {
        tag_name: body.tag_name ?? undefined,
        tag_code: body.tag_code ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    tag_name: updated.tag_name,
    tag_code: updated.tag_code,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
