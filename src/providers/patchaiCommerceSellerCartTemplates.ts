import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import { IPageIAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartTemplate";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search, filter, and paginate ai_commerce_cart_templates (cart templates).
 *
 * Returns a paginated, filtered list of cart templates for the requesting
 * seller. Sellers see only their own templates, filtered by name, store, active
 * status, and created date range. Only non-deleted templates (deleted_at IS
 * NULL) are included. Supports sort and pagination controls. Output is summary
 * format, not full templates.
 *
 * @param props - The request context.
 * @param props.seller - The authenticated seller payload (scopes results to
 *   seller-only).
 * @param props.body - Search, filter, and pagination criteria for cart
 *   templates.
 * @returns Paginated list of cart template summaries and pagination meta.
 */
export async function patchaiCommerceSellerCartTemplates(props: {
  seller: SellerPayload;
  body: IAiCommerceCartTemplate.IRequest;
}): Promise<IPageIAiCommerceCartTemplate.ISummary> {
  const { seller, body } = props;
  // page/limit are required and already branded in request
  const page = body.page;
  const limit = body.limit;

  // Compute skip for pagination
  const skip = (page - 1) * limit;

  // Build where clause with validated structure only
  const where = {
    deleted_at: null,
    creator_id: seller.id,
    ...(body.store_id !== undefined &&
      body.store_id !== null && { store_id: body.store_id }),
    ...(body.template_name !== undefined &&
      body.template_name !== null &&
      body.template_name.length > 0 && {
        template_name: { contains: body.template_name },
      }),
    ...(typeof body.active === "boolean" && { active: body.active }),
    // Date range for created_at
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Inline orderBy - allow only fields that exist via sort_by and valid literal direction, fallback to created_at desc
  const orderBy = body.sort_by
    ? { [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc" }
    : { created_at: "desc" };

  // Run both list and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_templates.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        template_name: true,
        description: true,
        active: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_cart_templates.count({ where }),
  ]);

  // Map DB results to ISummary DTO output, preserving exact types
  const data = rows.map((row) => ({
    id: row.id,
    template_name: row.template_name,
    description: row.description ?? null,
    active: row.active,
  }));

  // Assemble full response using DTO-compatible types; strip extra branding if needed
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
