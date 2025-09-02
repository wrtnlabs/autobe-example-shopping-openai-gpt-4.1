import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft deletes a product category by ID, retaining evidence for audit.
 *
 * This operation sets the `deleted_at` field of a product category identified
 * by UUID, effectively making it unavailable for product assignments or
 * navigation but retaining the record for evidence and audit. Only
 * administrators may perform this action. Throws an error if the category does
 * not exist or is already deleted. The operation is idempotent (multiple calls
 * with the same categoryId will not cause further effect after initial
 * deletion).
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.categoryId - The unique identifier (UUID) of the product
 *   category to soft delete
 * @returns Void
 * @throws {Error} If the product category does not exist or has already been
 *   deleted
 */
export async function delete__shoppingMallAiBackend_admin_productCategories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, categoryId } = props;

  // Ensure the admin is authenticated (decorator handles authorization contract)
  // Check if the target category exists and has not already been deleted
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
      {
        where: {
          id: categoryId,
          deleted_at: null,
        },
      },
    );
  if (!category) {
    throw new Error("Product category not found or already deleted");
  }

  // Soft delete by setting deleted_at to current timestamp (ISO string)
  await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.update({
    where: { id: categoryId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return needed for void on success
  return;
}
