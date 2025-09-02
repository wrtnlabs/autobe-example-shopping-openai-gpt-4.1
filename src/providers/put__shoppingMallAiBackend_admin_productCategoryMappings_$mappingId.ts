import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing product-category mapping for a product.
 *
 * This API operation allows an authorized admin to update a product-category
 * mapping in the system. Scenarios include correcting category assignments,
 * reorganizing catalog structure, and aligning with business changes. Strictly
 * validates referenced product and category existence, and ensures no duplicate
 * mapping is created. Only admins may perform this update.
 *
 * @param props - The request properties
 * @param props.admin - The admin performing the update (authorization enforced)
 * @param props.mappingId - The unique identifier (UUID) of the mapping to
 *   update
 * @param props.body - The fields to update: optional product ID, category ID,
 *   assigned_at
 * @returns The updated product-category mapping
 * @throws {Error} When mapping does not exist
 * @throws {Error} When referenced product or category does not exist
 * @throws {Error} When the update would violate uniqueness (duplicate mapping
 *   for the same product-category pair)
 */
export async function put__shoppingMallAiBackend_admin_productCategoryMappings_$mappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductCategoryMapping.IUpdate;
}): Promise<IShoppingMallAiBackendProductCategoryMapping> {
  const { admin, mappingId, body } = props;

  // 1. Fetch and ensure the mapping exists
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.findUnique(
      {
        where: { id: mappingId },
      },
    );
  if (!mapping) {
    throw new Error("Mapping not found");
  }

  // 2. If updating product/category, check referenced entities exist.
  if (body.shopping_mall_ai_backend_products_id !== undefined) {
    const prod =
      await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
        where: { id: body.shopping_mall_ai_backend_products_id },
      });
    if (!prod) throw new Error("Referenced product does not exist");
  }
  if (body.shopping_mall_ai_backend_product_categories_id !== undefined) {
    const cat =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findUnique(
        {
          where: { id: body.shopping_mall_ai_backend_product_categories_id },
        },
      );
    if (!cat) throw new Error("Referenced product category does not exist");
  }

  // 3. Check uniqueness constraint (if updating either field)
  const tgtProdId =
    body.shopping_mall_ai_backend_products_id ??
    mapping.shopping_mall_ai_backend_products_id;
  const tgtCatId =
    body.shopping_mall_ai_backend_product_categories_id ??
    mapping.shopping_mall_ai_backend_product_categories_id;
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.findFirst(
      {
        where: {
          shopping_mall_ai_backend_products_id: tgtProdId,
          shopping_mall_ai_backend_product_categories_id: tgtCatId,
          NOT: { id: mappingId },
        },
      },
    );
  if (duplicate) {
    throw new Error("A mapping for this product/category pair already exists.");
  }

  // 4. Update mapping; only update fields present in the body
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.update(
      {
        where: { id: mappingId },
        data: {
          shopping_mall_ai_backend_products_id:
            body.shopping_mall_ai_backend_products_id ?? undefined,
          shopping_mall_ai_backend_product_categories_id:
            body.shopping_mall_ai_backend_product_categories_id ?? undefined,
          assigned_at:
            body.assigned_at !== undefined
              ? toISOStringSafe(body.assigned_at)
              : undefined,
        },
      },
    );

  // 5. Return final object with correct type branding (and ISO date conversion)
  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    shopping_mall_ai_backend_product_categories_id:
      updated.shopping_mall_ai_backend_product_categories_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
  };
}
