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
 * Creates a new product option unit (variant value) within a specific option
 * group for a product.
 *
 * This operation inserts a selectable unit (such as a color or size value) into
 * the shopping_mall_ai_backend_product_option_units table, associating it with
 * the referenced product option group. Fields like display value, unit code,
 * and sort order are required, and system timestamps and unique identifiers are
 * handled per the data model. Only authorized admins may invoke this API to
 * maintain overall catalog integrity.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated Admin payload (must be active and not
 *   deleted)
 * @param props.productId - UUID of the parent product (for reference, not used
 *   in this table directly)
 * @param props.optionId - UUID of the product option group (foreign key in
 *   product_option_units)
 * @param props.body - The creation payload specifying unit_value, unit_code,
 *   and sort_order
 * @returns The newly created product option unit with full details
 * @throws {Error} When the admin is not found, inactive, or soft-deleted
 * @throws {Prisma.PrismaClientKnownRequestError} On unique constraint
 *   violations or other Prisma errors
 */
export async function post__shoppingMallAiBackend_admin_products_$productId_options_$optionId_units(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptionUnit.ICreate;
}): Promise<IShoppingMallAiBackendProductOptionUnit> {
  const { admin, optionId, body } = props;
  // Authorization: ensure admin exists, is active, and not soft-deleted
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!adminRecord) {
    throw new Error("Unauthorized: Admin account inactive or not found");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_product_options_id: optionId,
        unit_value: body.unit_value,
        unit_code: body.unit_code,
        sort_order: body.sort_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    shopping_mall_ai_backend_product_options_id:
      created.shopping_mall_ai_backend_product_options_id,
    unit_value: created.unit_value,
    unit_code: created.unit_code,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
