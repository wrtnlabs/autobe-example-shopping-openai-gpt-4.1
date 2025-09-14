import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { IPageIAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductCategoryBindings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List all category bindings for a product, with pagination, filtering, and
 * search.
 *
 * This endpoint returns a paginated, filterable, and sortable list of all
 * category bindings for a specified product, intended for admins and sellers to
 * manage cross-category product mapping. Results follow the standard
 * IPageIAiCommerceProductCategoryBindings shape, with page information and
 * category binding records. Authorization is required (admin or seller). Only
 * relevant filtering and sorting criteria from body are considered. All
 * date/datetime values are consistently formatted as ISO 8601 strings. No
 * native Date types are used at any point.
 *
 * @param props - Request properties. Includes authenticated admin, productId
 *   path parameter, and optional filter/sort body.
 * @param props.admin - AdminPayload authentication DTO (must be present,
 *   validated upstream).
 * @param props.productId - The unique product ID
 *   ({@link string & tags.Format<'uuid'>}) whose category bindings are being
 *   fetched.
 * @param props.body - The filter, sort, and pagination request body
 *   ({@link IAiCommerceProductCategoryBindings.IRequest})
 * @returns IPageIAiCommerceProductCategoryBindings - Page result with category
 *   binding list and page info.
 * @throws {Error} If filter or query parameters are structurally invalid (DTO
 *   validation), or database/internal error occurs.
 */
export async function patchaiCommerceAdminProductsProductIdCategoryBindings(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductCategoryBindings.IRequest;
}): Promise<IPageIAiCommerceProductCategoryBindings> {
  const { admin, productId, body } = props;

  // Determine and normalize pagination and sorting
  const sortBy = body.sort_by === "category_id" ? "category_id" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Dynamic where clause for all filters (never use null for optional fields)
  const where = {
    product_id: productId,
    ...(body.category_id !== undefined && { category_id: body.category_id }),
    ...(body.created_after !== undefined || body.created_before !== undefined
      ? {
          created_at: {
            ...(body.created_after !== undefined && {
              gte: body.created_after,
            }),
            ...(body.created_before !== undefined && {
              lte: body.created_before,
            }),
          },
        }
      : {}),
  };

  // Query concurrently for pagination efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_category_bindings.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_category_bindings.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      category_id: row.category_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
