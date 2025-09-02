import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently removes a product option unit (variant value) from a specific
 * product option group (soft delete).
 *
 * This operation marks the record as deleted in the
 * shopping_mall_ai_backend_product_option_units table by setting its deleted_at
 * column. The deletion is validated to ensure:
 *
 * - Only the seller that owns the product can perform the operation
 * - The product option unit belongs to the specified option and product
 * - The unit is not already deleted
 *
 * @param props - Request parameters
 * @returns Void (no content, soft-delete performed if successful)
 * @throws {Error} If the option unit does not exist, does not belong to the
 *   specified option or product, does not belong to this seller, or has already
 *   been soft-deleted
 * @field seller - Authenticated seller user making the request (SellerPayload)
 * @field productId - UUID of the parent product for which the option and unit are being managed
 * @field optionId - UUID of the product option group containing the unit
 * @field unitId - UUID of the product option unit to delete
 */
export async function delete__shoppingMallAiBackend_seller_products_$productId_options_$optionId_units_$unitId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, optionId, unitId } = props;

  // Fetch the target unit with nested option and product for full authorization and scope validation
  const unit =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.findUnique(
      {
        where: { id: unitId },
        include: {
          option: {
            include: {
              product: true,
            },
          },
        },
      },
    );

  if (!unit) {
    throw new Error("Option unit not found");
  }
  if (unit.shopping_mall_ai_backend_product_options_id !== optionId) {
    throw new Error("Option unit does not belong to specified option group");
  }
  if (!unit.option || !unit.option.product) {
    throw new Error("Option or parent product could not be resolved");
  }
  if (unit.option.product.id !== productId) {
    throw new Error("Option/Unit does not belong to specified product");
  }
  if ((unit.option.product as any).seller_id !== seller.id) {
    throw new Error(
      "Option unit does not belong to product owned by this seller",
    );
  }
  if (unit.deleted_at) {
    throw new Error("Option unit already deleted");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.update({
    where: { id: unitId },
    data: { deleted_at: now },
  });
  // No return value
}
