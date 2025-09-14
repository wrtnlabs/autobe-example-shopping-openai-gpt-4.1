import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { IPageIAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductSectionBinding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list product-section bindings for a product
 * (ai_commerce_product_section_bindings).
 *
 * This endpoint allows platform administrators to retrieve merchandising
 * section bindings for a specific product, supporting advanced filtering (by
 * section_id), sorting, and pagination. This operation is strictly read-only
 * and requires admin privileges.
 *
 * Business rules: Only active platform admins may access this data. The
 * endpoint does not expose any deleted bindings (table does not support soft
 * delete). Sorting fields are limited to 'section_id', 'product_id', and
 * 'display_order'. Pagination using 'page' and 'limit' is enforced, with
 * sensible defaults if not provided.
 *
 * @param props - Parameters for search
 * @param props.admin - The authenticated admin user (authorization required)
 * @param props.productId - The product ID (UUID) for which binding records
 *   should be listed
 * @param props.body - Filtering and pagination settings
 *   (IAiCommerceProductSectionBinding.IRequest)
 * @returns Paginated list of bindings for the product/section per specified
 *   options
 * @throws Error if unauthorized or parameters are invalid
 */
export async function patchaiCommerceAdminProductsProductIdSectionBindings(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSectionBinding.IRequest;
}): Promise<IPageIAiCommerceProductSectionBinding> {
  const { productId, body } = props;
  const { section_id, sort_by, sort_order, page, limit } = body ?? {};

  // -- Pagination defaults --
  const pageNumber = page ?? 1;
  const pageLimit = limit ?? 20;

  // -- Enforce allowed sort fields (ONLY schema fields--do NOT include created_at)
  const allowedSortFields = ["section_id", "product_id", "display_order"];
  const sortBy = allowedSortFields.includes(String(sort_by))
    ? String(sort_by)
    : "display_order";
  const sortOrder = sort_order === "asc" ? "asc" : "desc";

  // -- WHERE clause: always filter by product_id, optionally by section_id
  const where = {
    product_id: productId,
    ...(section_id !== undefined ? { section_id } : {}),
  };

  // -- Query and get count (no deleted_at filter as table supports hard-delete only)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_section_bindings.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    }),
    MyGlobal.prisma.ai_commerce_product_section_bindings.count({ where }),
  ]);

  // -- Compose paginated result, enforcing correct branded types per IPage.IPagination
  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(pageLimit),
      records: total,
      pages: Math.ceil(total / Number(pageLimit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      section_id: row.section_id,
      display_order: row.display_order,
    })),
  };
}
