import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an existing product option unit's details (such as value or display
 * order) for a product option group.
 *
 * Updates the details of a specific product option unit (such as its value,
 * code, or sort order) within a given product and option group. This operation
 * modifies the record in the shopping_mall_ai_backend_product_option_units
 * table, allowing for corrections or reorganization of available units.
 * Modification is recorded with timestamp updates and supports catalog
 * maintenance processes for sellers and admins.
 *
 * Note: Due to schema limitations, seller-ownership validation of a product is
 * not enforceable, so only a valid seller auth is required.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making this request
 * @param props.productId - ID of the parent product (used for context; not for
 *   any ownership validation)
 * @param props.optionId - ID of the product option group containing the unit
 * @param props.unitId - ID of the product option unit to update
 * @param props.body - Updated details for the product option unit (unit_value,
 *   unit_code, sort_order)
 * @returns The updated option unit, including all required DTO fields
 * @throws {Error} When the target unit is not found or is already deleted
 */
export async function put__shoppingMallAiBackend_seller_products_$productId_options_$optionId_units_$unitId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptionUnit.IUpdate;
}): Promise<IShoppingMallAiBackendProductOptionUnit> {
  const { optionId, unitId, body } = props;

  // Find target unit with correct parent and not soft-deleted
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
  if (!existing) throw new Error("Option unit not found or has been deleted");

  // Update provided fields, always update updated_at
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.update({
      where: { id: unitId },
      data: {
        unit_value: body.unit_value ?? undefined,
        unit_code: body.unit_code ?? undefined,
        sort_order: body.sort_order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_product_options_id:
      updated.shopping_mall_ai_backend_product_options_id,
    unit_value: updated.unit_value,
    unit_code: updated.unit_code,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
