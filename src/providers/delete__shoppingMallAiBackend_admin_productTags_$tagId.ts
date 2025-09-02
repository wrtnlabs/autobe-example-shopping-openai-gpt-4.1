import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a product tag by its unique identifier.
 *
 * This API marks the product tag as logically deleted by setting `deleted_at`
 * to the current ISO 8601 timestamp. It does not physically remove the tag from
 * the database, supporting evidence and compliance requirements. Only
 * non-deleted tags can be soft-deleted. The action is strictly restricted to
 * authorized admin users responsible for catalog management.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation (must
 *   have catalog management rights)
 * @param props.tagId - Unique identifier of the product tag to delete
 * @returns Void
 * @throws {Error} When the tag does not exist or has already been deleted
 *   (soft-deleted), an error is thrown to prevent silent failures.
 */
export async function delete__shoppingMallAiBackend_admin_productTags_$tagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tagId } = props;

  // STEP 1: Find only the active (not already deleted) tag matching the ID
  const tag =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findFirst({
      where: {
        id: tagId,
        deleted_at: null,
      },
    });
  if (!tag) {
    throw new Error("Tag not found or already deleted");
  }

  // STEP 2: Get current time as ISO string for audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // STEP 3: Update tag to mark as deleted (soft delete, evidence retained)
  await MyGlobal.prisma.shopping_mall_ai_backend_product_tags.update({
    where: { id: tagId },
    data: {
      deleted_at: now,
    },
  });
}
