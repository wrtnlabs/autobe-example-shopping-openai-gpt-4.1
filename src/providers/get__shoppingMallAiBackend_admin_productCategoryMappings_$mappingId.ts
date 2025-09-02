import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details for a specific product-category mapping by UUID.
 *
 * Fetch a specific product-category mapping with full resolution of both mapped
 * product and category. This endpoint allows admin or catalog managers to
 * review the placement or assignment status of a given product in the hierarchy
 * or product catalog structure. All fields of the mapping record, including
 * both product and category references, are returned.
 *
 * Authorization is required to access mapping details. This operation is useful
 * for catalog editing/validation, evidence preservation, or structural catalog
 * diagnostics. Errors are raised for nonexistent or unauthorized access.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making the request
 * @param props.mappingId - The UUID assigned to this product-category mapping
 *   record
 * @returns Full mapping record linking product and category by UUID and the
 *   relevant metadata
 * @throws {Error} When the mapping is not found or access is unauthorized
 */
export async function get__shoppingMallAiBackend_admin_productCategoryMappings_$mappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductCategoryMapping> {
  const { mappingId } = props;
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.findUniqueOrThrow(
      {
        where: { id: mappingId },
        select: {
          id: true,
          shopping_mall_ai_backend_products_id: true,
          shopping_mall_ai_backend_product_categories_id: true,
          assigned_at: true,
        },
      },
    );
  return {
    id: record.id,
    shopping_mall_ai_backend_products_id:
      record.shopping_mall_ai_backend_products_id,
    shopping_mall_ai_backend_product_categories_id:
      record.shopping_mall_ai_backend_product_categories_id,
    assigned_at: toISOStringSafe(record.assigned_at),
  };
}
