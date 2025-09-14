import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductTag";
import { IPageIAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search for product-tag bindings (ai_commerce_product_tags).
 *
 * Enables system administrators to query, filter, and paginate product-tag
 * binding records for advanced search, analytics, compliance, and audit
 * workflows. Supports filtering by product or tag UUID, as well as paging and
 * limit for result windowing. Only authorized admins may call this endpoint;
 * all business rules regarding access are enforced at the application and
 * infrastructure layer.
 *
 * @param props - Parameters for the paginated product-tag search
 * @param props.admin - Authenticated system administrator invoking the endpoint
 * @param props.body - Filter criteria and pagination options for searching
 *   product-tag bindings
 * @returns Paginated results corresponding to the filtered product-tag bindings
 * @throws {Error} If database access fails, invalid filters are supplied, or
 *   unauthorized access occurs
 */
export async function patchaiCommerceAdminProductTags(props: {
  admin: AdminPayload;
  body: IAiCommerceProductTag.IRequest;
}): Promise<IPageIAiCommerceProductTag> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause using only fields present in schema and DTO
  const where = {
    ...(body.ai_commerce_product_id !== undefined && {
      ai_commerce_product_id: body.ai_commerce_product_id,
    }),
    ...(body.ai_commerce_tag_id !== undefined && {
      ai_commerce_tag_id: body.ai_commerce_tag_id,
    }),
  };

  // Run in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_tags.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        ai_commerce_product_id: true,
        ai_commerce_tag_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_product_tags.count({ where }),
  ]);

  // Build DTO array, converting dates to correct branded ISO format
  const data: IAiCommerceProductTag[] = rows.map((row) => ({
    id: row.id,
    ai_commerce_product_id: row.ai_commerce_product_id,
    ai_commerce_tag_id: row.ai_commerce_tag_id,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Compose paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
