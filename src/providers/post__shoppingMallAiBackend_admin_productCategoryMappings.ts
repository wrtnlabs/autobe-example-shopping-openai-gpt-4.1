import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new mapping between a product and a product category in the
 * catalog.
 *
 * Allows admins to assign products to categories for catalog structure/search,
 * enforcing duplicate prevention and validation. All date/time values are
 * handled as string & tags.Format<'date-time'>, and id is uuid.
 *
 * @param props - Props with admin authentication and body ICreate
 * @param props.admin - Authenticated admin user (see AdminPayload)
 * @param props.body - Mapping creation input
 *   (IShoppingMallAiBackendProductCategoryMapping.ICreate)
 * @returns The created mapping DTO
 *   (IShoppingMallAiBackendProductCategoryMapping)
 * @throws {Error} If product or category does not exist
 * @throws {Error} If mapping already exists
 */
export async function post__shoppingMallAiBackend_admin_productCategoryMappings(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductCategoryMapping.ICreate;
}): Promise<IShoppingMallAiBackendProductCategoryMapping> {
  const { admin, body } = props;

  // 1. Ensure product exists
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: { id: body.shopping_mall_ai_backend_products_id },
    });
  if (!product) throw new Error("Product does not exist");

  // 2. Ensure category exists
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
      {
        where: { id: body.shopping_mall_ai_backend_product_categories_id },
      },
    );
  if (!category) throw new Error("Category does not exist");

  // 3. Check for duplicate mapping
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.findFirst(
      {
        where: {
          shopping_mall_ai_backend_products_id:
            body.shopping_mall_ai_backend_products_id,
          shopping_mall_ai_backend_product_categories_id:
            body.shopping_mall_ai_backend_product_categories_id,
        },
      },
    );
  if (exists) throw new Error("Mapping already exists");

  // 4. Prepare assignment timestamp with correct format
  const assignedAt = toISOStringSafe(body.assigned_at);

  // 5. Insert mapping
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_ai_backend_products_id:
            body.shopping_mall_ai_backend_products_id,
          shopping_mall_ai_backend_product_categories_id:
            body.shopping_mall_ai_backend_product_categories_id,
          assigned_at: assignedAt,
        },
      },
    );

  // 6. Return mapping DTO, converting DateTime to string brand
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id as string &
        tags.Format<"uuid">,
    shopping_mall_ai_backend_product_categories_id:
      created.shopping_mall_ai_backend_product_categories_id as string &
        tags.Format<"uuid">,
    assigned_at: toISOStringSafe(created.assigned_at),
  };
}
