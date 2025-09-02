import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { IPageIShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductBundle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search all bundles/SKUs for a specific product.
 *
 * Retrieves a paginated and filterable list of product bundles (SKU variants
 * grouping specific option units) for a given product. This operation searches
 * the shopping_mall_ai_backend_product_bundles table for bundles associated
 * with the requested product, supporting search and pagination by bundle
 * attributes such as name, SKU, price, and sort order. Authorization logic
 * limits result visibility to the product's seller or platform admins (here:
 * admin).
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.productId - UUID of the product whose bundles are being listed
 * @param props.body - Filter/pagination/search options for the bundles
 * @returns Paginated list of simplified bundle information for management
 *   workflows
 * @throws {Error} When product does not exist
 */
export async function patch__shoppingMallAiBackend_admin_products_$productId_bundles(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductBundle.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductBundle.ISummary> {
  const { admin, productId, body } = props;

  // Ensure the product exists (admins are allowed to search any product)
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: { id: productId, deleted_at: null },
      select: { id: true },
    });
  if (!product) throw new Error("Product not found");

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build where condition (no reference to non-existent fields in body)
  const whereCondition = {
    shopping_mall_ai_backend_products_id: productId,
    deleted_at: null,
    ...(body.search && {
      OR: [
        {
          bundle_name: { contains: body.search, mode: "insensitive" as const },
        },
        { sku_code: { contains: body.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findMany({
      where: whereCondition,
      orderBy: { created_at: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_products_id:
        row.shopping_mall_ai_backend_products_id,
      bundle_name: row.bundle_name,
      sku_code: row.sku_code,
      price: row.price,
      inventory_policy: row.inventory_policy,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
