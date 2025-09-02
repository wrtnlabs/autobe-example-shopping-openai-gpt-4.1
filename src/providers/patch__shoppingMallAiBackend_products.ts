import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Search and paginate products in the AI-powered shopping mall backend.
 *
 * Retrieve a paginated and filterable list of products, supporting multi-field
 * search, advanced sorting, and customizable filters on business status, type,
 * and other properties as required by shopping_mall_ai_backend_products. This
 * operation is fundamental for customer-facing catalog exploration, seller
 * product management, and administrator moderation or analytics workflows.
 *
 * Security is managed via role-based access; customers, sellers, or admins may
 * have different default result sets. The search supports partial and full-text
 * matching, as well as filtering on the product's core and extended attributes
 * defined in the schema. This endpoint integrates deeply with inventory,
 * options, and category relations for dynamic product catalog rendering.
 *
 * Validation enforces pagination and allowed filter formats, and handles error
 * cases such as invalid filter parameters or excessive page size requests.
 * Related endpoints include single-product detail fetch, product creation, and
 * update.
 *
 * @param props - Request properties
 * @param props.body - Search/filter parameters for paginated product requests
 *   (fields, query, sort, pagination)
 * @returns Paginated product results with all requested details and summary
 *   data.
 * @throws {Error} When pagination parameters are invalid (negative/non-positive
 *   page, excessive limit, etc)
 */
export async function patch__shoppingMallAiBackend_products(props: {
  body: IShoppingMallAiBackendProduct.IRequest;
}): Promise<IPageIShoppingMallAiBackendProduct> {
  const {
    page = 1,
    limit = 20,
    title,
    product_type,
    business_status,
    tax_code,
    sort_by,
    sort_dir,
  } = props.body || {};
  if (typeof limit !== "undefined" && (limit > 100 || limit < 1)) {
    throw new Error("Invalid limit. Maximum allowed is 100, minimum is 1.");
  }
  if (typeof page !== "undefined" && page < 1) {
    throw new Error("Invalid page. Page must be at least 1.");
  }
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "title",
    "slug",
    "product_type",
    "business_status",
    "tax_code",
    "sort_priority",
    "min_order_quantity",
    "max_order_quantity",
  ];
  const sortField =
    sort_by && allowedSortFields.includes(sort_by) ? sort_by : "created_at";
  const sortOrder = sort_dir === "asc" ? "asc" : "desc";
  const where = {
    deleted_at: null,
    ...(product_type !== undefined &&
      product_type !== null && { product_type }),
    ...(business_status !== undefined &&
      business_status !== null && { business_status }),
    ...(tax_code !== undefined && tax_code !== null && { tax_code }),
    ...(title !== undefined &&
      title !== null && {
        OR: [
          { title: { contains: title, mode: "insensitive" as const } },
          { description: { contains: title, mode: "insensitive" as const } },
        ],
      }),
  };
  const skip = Number(page) > 1 ? (Number(page) - 1) * Number(limit) : 0;
  const take = Number(limit);
  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_products.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_products.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: products.map((prod) => ({
      id: prod.id,
      title: prod.title,
      slug: prod.slug,
      description: prod.description ?? undefined,
      product_type: prod.product_type,
      business_status: prod.business_status,
      min_order_quantity: prod.min_order_quantity,
      max_order_quantity: prod.max_order_quantity,
      tax_code: prod.tax_code,
      sort_priority: prod.sort_priority,
      created_at: toISOStringSafe(prod.created_at),
      updated_at: toISOStringSafe(prod.updated_at),
      deleted_at:
        prod.deleted_at !== null && prod.deleted_at !== undefined
          ? toISOStringSafe(prod.deleted_at)
          : null,
    })),
  };
}
