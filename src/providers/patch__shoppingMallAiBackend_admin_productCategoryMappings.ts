import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";
import { IPageIShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductCategoryMapping";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, searchable list of all product-to-category mapping
 * records in the backend.
 *
 * Enables administrators to audit category assignments, analyze product
 * taxonomy compliance, and manage catalog structure efficiently. The table
 * 'shopping_mall_ai_backend_product_category_mappings' holds references between
 * products and categories with assignment timestamps. This read operation
 * allows filtering and bulk review across the full product dataset, supporting
 * business auditing, catalog organization, and integrity checks for
 * product-category relationships.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the query
 * @param props.body - Paging, sorting, and filtering parameters for map
 *   retrieval
 * @returns A paginated list of product-category mapping summary records with
 *   pagination metadata
 * @throws {Error} When admin authorization fails or database query fails
 */
export async function patch__shoppingMallAiBackend_admin_productCategoryMappings(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductCategoryMapping.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductCategoryMapping> {
  const { admin, body } = props;

  // Extract and validate pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Only allow sorting by whitelisted fields
  const allowedSortFields = [
    "assigned_at",
    "id",
    "shopping_mall_ai_backend_products_id",
    "shopping_mall_ai_backend_product_categories_id",
  ];
  const sort_by = allowedSortFields.includes(body.sort ?? "")
    ? body.sort!
    : "assigned_at";
  const sort_order =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // WHERE filter composition (only apply filters if value is not undefined OR null)
  const where = {
    ...(body.shopping_mall_ai_backend_products_id !== undefined &&
      body.shopping_mall_ai_backend_products_id !== null && {
        shopping_mall_ai_backend_products_id:
          body.shopping_mall_ai_backend_products_id,
      }),
    ...(body.shopping_mall_ai_backend_product_categories_id !== undefined &&
      body.shopping_mall_ai_backend_product_categories_id !== null && {
        shopping_mall_ai_backend_product_categories_id:
          body.shopping_mall_ai_backend_product_categories_id,
      }),
  };

  // Execute queries in parallel: find paginated data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.findMany(
      {
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          shopping_mall_ai_backend_products_id: true,
          shopping_mall_ai_backend_product_categories_id: true,
          assigned_at: true,
        },
      },
    ),
    MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.count({
      where,
    }),
  ]);

  // Map queried rows to ISummary DTO, convert all Date fields using toISOStringSafe
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_products_id:
        row.shopping_mall_ai_backend_products_id,
      shopping_mall_ai_backend_product_categories_id:
        row.shopping_mall_ai_backend_product_categories_id,
      assigned_at: toISOStringSafe(row.assigned_at),
    })),
  };
}
