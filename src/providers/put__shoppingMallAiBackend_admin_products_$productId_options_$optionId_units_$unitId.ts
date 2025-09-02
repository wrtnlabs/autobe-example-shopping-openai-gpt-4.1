import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing product option unit (such as value, code, or sort order)
 * in a product option group.
 *
 * This operation allows authorized admins to modify details of a selected
 * product option unit. Edits may include changing the display value, unit code,
 * or sort order within its parent option group.
 *
 * Business rules:
 *
 * - Only allows modifications if the option unit exists and is not soft deleted.
 * - All updateable fields are optional; only supplied fields are modified.
 * - Updated timestamp is always set to request time.
 * - Unique constraint on (optionId, unit_code) is enforced by the database;
 *   duplicate codes will throw an error.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 *   (AdminPayload)
 * @param props.productId - The parent product's UUID (for routing; not directly
 *   verified here)
 * @param props.optionId - The option group UUID (must match the unit's option
 *   FK)
 * @param props.unitId - The option unit's UUID to update
 * @param props.body - The update fields: one or more of unit_value, unit_code,
 *   or sort_order
 * @returns The updated product option unit with all fields
 * @throws {Error} When the target option unit does not exist, is deleted, or if
 *   unique unit_code constraint is violated
 */
export async function put__shoppingMallAiBackend_admin_products_$productId_options_$optionId_units_$unitId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptionUnit.IUpdate;
}): Promise<IShoppingMallAiBackendProductOptionUnit> {
  const { admin, productId, optionId, unitId, body } = props;

  // Authorization covers: must be admin (already checked by decorator)

  // Find the target unit and ensure it exists and is not soft deleted
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
    throw new Error("Product option unit not found or already deleted");
  }

  // Prepare update data: Only supplied fields updated
  try {
    const now = toISOStringSafe(new Date());
    const updated =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.update(
        {
          where: { id: unitId },
          data: {
            unit_value: body.unit_value ?? undefined,
            unit_code: body.unit_code ?? undefined,
            sort_order: body.sort_order ?? undefined,
            updated_at: now,
          },
        },
      );

    return {
      id: updated.id,
      shopping_mall_ai_backend_product_options_id:
        updated.shopping_mall_ai_backend_product_options_id,
      unit_value: updated.unit_value,
      unit_code: updated.unit_code,
      sort_order: updated.sort_order,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } catch (err) {
    // Check if this is a Prisma unique constraint violation for unit_code uniqueness
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint failed on (optionId, unit_code)
      throw new Error(
        "Duplicate unit_code: Another unit in this option group already uses that unit_code. Unit codes must be unique within an option group.",
      );
    }
    // Otherwise, propagate the original error
    throw err;
  }
}
