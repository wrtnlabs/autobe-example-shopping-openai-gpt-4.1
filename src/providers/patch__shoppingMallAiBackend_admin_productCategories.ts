import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import { IPageIShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated and filterable list of all product categories
 * registered in the system.
 *
 * This operation allows advanced querying, sorting, and filtering of product
 * categories by various criteria such as name, code, or hierarchical relation.
 * It is intended for administrators or seller managers to efficiently browse,
 * review, and manage product categories in bulk. Leverages the
 * 'shopping_mall_ai_backend_product_categories' table, which includes category
 * name, code, display order, activation state, and parent-child hierarchy for
 * building navigational structures in a multichannel environment. Supports
 * analytics segmentation and hierarchical data exploration. Returns a paged
 * result with summary data per product category.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - Complex query and filter parameters for searching product
 *   categories (e.g., name, code, parent-child, is_active) with paging and sort
 *   options
 * @returns A paginated result set containing summaries of matching product
 *   categories, including hierarchical and business fields as appropriate
 * @throws {Error} When the admin is not found, inactive, or unauthorized
 */
export async function patch__shoppingMallAiBackend_admin_productCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductCategory.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductCategory.ISummary> {
  const { admin, body } = props;
  // Authorization check: Confirm admin exists/is_active
  const adminCheck =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!adminCheck) {
    throw new Error("Unauthorized: Admin does not exist or is not active");
  }

  // Dynamic where clause construction for filters
  const where = {
    deleted_at: null,
    ...(body.category_name !== undefined &&
      body.category_name !== null && {
        category_name: {
          contains: body.category_name,
          mode: "insensitive" as const,
        },
      }),
    ...(body.category_code !== undefined &&
      body.category_code !== null && {
        category_code: {
          contains: body.category_code,
          mode: "insensitive" as const,
        },
      }),
    ...(body.parent_id !== undefined && {
      parent_id: body.parent_id === null ? null : body.parent_id,
    }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const allowedSortFields = [
    "category_name",
    "category_code",
    "parent_id",
    "category_depth",
    "is_active",
    "sort_order",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "sort_order";
  const sortOrder = body.order === "desc" ? "desc" : "asc";

  // Main query + count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_categories.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((c) => ({
      id: c.id,
      category_name: c.category_name,
      category_code: c.category_code,
      parent_id: c.parent_id ?? null,
      category_depth: c.category_depth,
      is_active: c.is_active,
      sort_order: c.sort_order,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
      deleted_at:
        c.deleted_at !== undefined && c.deleted_at !== null
          ? toISOStringSafe(c.deleted_at)
          : null,
    })),
  };
}
