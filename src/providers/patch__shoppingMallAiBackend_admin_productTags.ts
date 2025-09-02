import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import { IPageIShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list product tags with advanced filtering and pagination.
 *
 * Retrieves a filtered, sorted, and paginated list of product tags for
 * monitoring, management, and analytics purposes. This endpoint allows sellers
 * and admins to search by tag name, filter by tag code or status, and apply
 * pagination for large datasets. It is critical for managing product
 * discoverability, recommendation systems, and business analytics, providing
 * support for AI augmentation or compliance-driven tag regulations. Errors
 * include invalid search queries or insufficient permission to view all tags.
 * This API is commonly used with tag creation and update workflows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 *   (required)
 * @param props.body - Search filters, sort options, and pagination for querying
 *   product tags
 * @returns Paginated and filtered list of product tags matching the criteria
 * @throws {Error} If insufficient permission or an unexpected database error
 *   occurs
 */
export async function patch__shoppingMallAiBackend_admin_productTags(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductTag.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductTag> {
  const { body } = props;
  // Only allow order_by on whitelisted schema columns
  const allowedOrderBy = ["tag_name", "tag_code", "created_at", "updated_at"];
  const orderBy =
    body.order_by && allowedOrderBy.includes(body.order_by)
      ? body.order_by
      : "created_at";
  const sort = body.sort === "asc" ? "asc" : "desc";

  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;

  // Build the Prisma where condition (case-insensitive contains for tag_name/tag_code; soft-delete logic)
  const where = {
    ...(body.tag_name != null && {
      tag_name: { contains: body.tag_name, mode: "insensitive" as const },
    }),
    ...(body.tag_code != null && {
      tag_code: { contains: body.tag_code, mode: "insensitive" as const },
    }),
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
  };

  // Fetch paginated records and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_tags.findMany({
      where,
      orderBy: { [orderBy]: sort },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_tags.count({ where }),
  ]);

  // Build the response according to IPageIShoppingMallAiBackendProductTag spec
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((tag) => ({
      id: tag.id,
      tag_name: tag.tag_name,
      tag_code: tag.tag_code,
      created_at: toISOStringSafe(tag.created_at),
      updated_at: toISOStringSafe(tag.updated_at),
      deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
    })),
  };
}
