import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve a paginated list of all products with advanced filtering
 * and search.
 *
 * Retrieves a paginated and filterable list of all products registered in the
 * system. Operates on shopping_mall_ai_backend_products, supporting searching,
 * filtering, and ordering. Returns summary product fields for catalog/search UI
 * and analytics.
 *
 * Only non-deleted products (deleted_at is null) are returned. Filtering
 * supports partial and exact match, and sorting is restricted to documented
 * fields.
 *
 * @param props - Properties for product search, including:
 *
 *   - Props.seller: The authenticated seller context (required for access control)
 *   - Props.body: Filter/search/pagination/sort info per
 *       IShoppingMallAiBackendProduct.IRequest
 *
 * @returns Paginated, filtered, and sorted list of products as summary records,
 *   with strict API typing
 * @throws {Error} On database error or invalid query parameters
 */
export async function patch__shoppingMallAiBackend_seller_products(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendProduct.IRequest;
}): Promise<IPageIShoppingMallAiBackendProduct.ISummary> {
  const { seller, body } = props;
  // Pagination (defaults)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Build where clause for filtering
  const where = {
    deleted_at: null,
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && {
        title: { contains: body.title, mode: "insensitive" as const },
      }),
    ...(body.product_type !== undefined &&
      body.product_type !== null && {
        product_type: body.product_type,
      }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.tax_code !== undefined &&
      body.tax_code !== null && {
        tax_code: body.tax_code,
      }),
  };
  // Restrict sorting to allowed fields
  const sortable = [
    "created_at",
    "updated_at",
    "sort_priority",
    "title",
    "min_order_quantity",
    "max_order_quantity",
  ];
  const sort_by =
    body.sort_by && sortable.includes(body.sort_by)
      ? body.sort_by
      : "updated_at";
  const sort_dir =
    body.sort_dir && (body.sort_dir === "asc" || body.sort_dir === "desc")
      ? body.sort_dir
      : "desc";
  // Fetch data and count in parallel
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_products.findMany({
      where,
      orderBy: { [sort_by]: sort_dir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        product_type: true,
        business_status: true,
        tax_code: true,
        min_order_quantity: true,
        max_order_quantity: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_products.count({ where }),
  ]);
  // Format/brand results for API type compliance
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(count),
      pages: Math.ceil(Number(count) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      product_type: row.product_type,
      business_status: row.business_status,
      tax_code: row.tax_code,
      min_order_quantity: row.min_order_quantity,
      max_order_quantity: row.max_order_quantity,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
