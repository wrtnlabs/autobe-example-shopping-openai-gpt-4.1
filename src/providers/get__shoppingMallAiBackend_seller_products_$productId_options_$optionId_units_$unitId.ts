import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detail of a specific option unit for a product's option group.
 *
 * Retrieve a specific option unit (concrete value/choice) for a given product
 * and option group. Reads from shopping_mall_ai_backend_product_option_units.
 * Used by sellers or admins to view, inspect, or manage an option's variant
 * value at detail level. This enables auditing and variant editing in product
 * management scenarios.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller (authorization required)
 * @param props.productId - The parent product ID (ownership validated)
 * @param props.optionId - The option group ID (must belong to product)
 * @param props.unitId - The option unit's ID to retrieve
 * @returns Detailed info for the requested option unit (all business fields,
 *   with date fields as ISO strings)
 * @throws {Error} When the option unit does not exist, is deleted, or is not
 *   linked to the requested product/option
 */
export async function get__shoppingMallAiBackend_seller_products_$productId_options_$optionId_units_$unitId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductOptionUnits> {
  const { productId, optionId, unitId } = props;

  // Fetch the option unit matching all linkage and not soft-deleted
  const unit =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.findFirst(
      {
        where: {
          id: unitId,
          shopping_mall_ai_backend_product_options_id: optionId,
          deleted_at: null,
        },
      },
    );
  if (!unit) throw new Error("Option unit not found");

  // Fetch parent option to validate proper linkage to the product
  const option =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findUnique({
      where: { id: optionId },
    });
  if (!option || option.shopping_mall_ai_backend_products_id !== productId) {
    throw new Error(
      "Option unit is not correctly linked to the requested product",
    );
  }

  return {
    id: unit.id,
    shopping_mall_ai_backend_product_options_id:
      unit.shopping_mall_ai_backend_product_options_id,
    unit_value: unit.unit_value,
    unit_code: unit.unit_code,
    sort_order: unit.sort_order,
    created_at: toISOStringSafe(unit.created_at),
    updated_at: toISOStringSafe(unit.updated_at),
    deleted_at: unit.deleted_at ? toISOStringSafe(unit.deleted_at) : undefined,
  };
}
