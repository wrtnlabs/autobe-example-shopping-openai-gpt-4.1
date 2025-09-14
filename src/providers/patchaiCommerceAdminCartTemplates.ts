import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { IPageIAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and paginate ai_commerce_cart_templates (cart templates).
 *
 * Searches, filters, and paginates cart templates using criteria like name,
 * creator, store, and status from ai_commerce_cart_templates. Sellers only see
 * their own; admins have global audit access. Supports partial matches and sort
 * order. Pagination metadata in response. Intended for template management,
 * campaign support, or troubleshooting rollouts.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the search
 * @param props.body - Filters, sort, and paging criteria per
 *   IAiCommerceCartTemplate.IRequest
 * @returns Paginated result: summary list of cart templates and pagination
 *   state information.
 * @throws {Error} If there is a database error or unexpected condition
 */
export async function patchaiCommerceAdminCartTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceCartTemplate.IRequest;
}): Promise<IPageIAiCommerceCartTemplate.ISummary> {
  const { body } = props;

  // Only allow known fields for sort_by
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "template_name",
    "active",
  ];
  let sort_by = body.sort_by;
  if (!allowedSortFields.includes(sort_by ?? "")) {
    sort_by = "created_at";
  }
  const sort_order: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  const page = body.page >= 1 ? body.page : 1;
  const limit = body.limit >= 1 ? body.limit : 10;

  // Build where filters only with real filterable fields
  const filters = {
    ...(body.creator_id !== undefined && { creator_id: body.creator_id }),
    ...(body.store_id !== undefined && { store_id: body.store_id }),
    ...(body.template_name !== undefined && {
      template_name: { contains: body.template_name },
    }),
    ...(body.active !== undefined && { active: body.active }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_templates.findMany({
      where: filters,
      orderBy: { [sort_by as string]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        template_name: true,
        description: true,
        active: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_cart_templates.count({ where: filters }),
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
      template_name: row.template_name,
      description: row.description ?? undefined,
      active: row.active,
    })),
  };
}
