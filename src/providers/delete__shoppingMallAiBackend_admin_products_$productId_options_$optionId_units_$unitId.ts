import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently removes a product option unit (such as a variant value) from a
 * specific product option group (soft delete).
 *
 * This operation marks the product option unit as deleted in the
 * shopping_mall_ai_backend_product_option_units table by setting its
 * `deleted_at` and `updated_at` fields. Deletion is permitted only if the
 * option unit exists, belongs to the referenced group, and is not already
 * deleted. Only authorized admins may invoke this operation.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.productId - The ID of the product this option/unit belongs to
 *   (not used directly, context for audit)
 * @param props.optionId - The ID of the product option group the unit is in
 * @param props.unitId - The ID of the option unit to soft delete
 * @returns Void
 * @throws {Error} If the option unit does not exist, is already deleted, or
 *   does not belong to the given option group
 */
export async function delete__shoppingMallAiBackend_admin_products_$productId_options_$optionId_units_$unitId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, optionId, unitId } = props;

  // Step 1: Validate the product option unit exists, belongs to the given option group, and is not already soft deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.findFirst(
      {
        where: {
          id: unitId,
          shopping_mall_ai_backend_product_options_id: optionId,
          deleted_at: null,
        },
      },
    );

  if (!existing) {
    throw new Error(
      "Product option unit not found, does not belong to this option group, or already deleted",
    );
  }

  // Step 2: Soft delete (set deleted_at), update updated_at for audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.update({
    where: { id: unitId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
