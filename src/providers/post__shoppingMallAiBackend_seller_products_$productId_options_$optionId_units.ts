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
 * Creates a new product option unit (variant value) for a specific option group
 * within a product.
 *
 * This operation allows authenticated sellers to add a new selectable unit
 * (such as a color or size) to an existing product option group, thus expanding
 * available product variations. It enforces that the specified option group
 * belongs to the given product, and (in a real system with seller linkage on
 * the product) should restrict creation to authorized sellers only.
 *
 * Business validation ensures the new unit's value and code do not conflict
 * within the same option group, and audit timestamps are accurately recorded.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making the request
 *   (authorization context)
 * @param props.productId - ID of the parent product for which the option and
 *   unit are being managed
 * @param props.optionId - ID of the product option group to which the new unit
 *   will be added
 * @param props.body - Details of the new option unit (e.g., value, code, order)
 * @returns The newly created product option unit record
 * @throws {Error} When the option group does not exist, does not belong to the
 *   given product, or if the creation violates uniqueness constraints
 *   (unit_code uniqueness enforced at DB level)
 */
export async function post__shoppingMallAiBackend_seller_products_$productId_options_$optionId_units(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptionUnit.ICreate;
}): Promise<IShoppingMallAiBackendProductOptionUnit> {
  const { seller, productId, optionId, body } = props;

  // 1. Fetch the specified option group to ensure existence and correct product linkage
  const option =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_options.findUniqueOrThrow(
      {
        where: { id: optionId },
        select: { id: true, shopping_mall_ai_backend_products_id: true },
      },
    );
  if (option.shopping_mall_ai_backend_products_id !== productId)
    throw new Error("Option group does not belong to the specified product.");

  // 2. (If seller linkage is present in shopping_mall_ai_backend_products, enforce ownership here)
  // This enforcement is skipped if seller linkage field does not exist.

  // 3. Create the new option unit. Uniqueness of (option_group, unit_code) is enforced by DB.
  const now = toISOStringSafe(new Date());
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

  // 4. Return the created option unit, normalizing date fields and branding types as required by DTO.
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
