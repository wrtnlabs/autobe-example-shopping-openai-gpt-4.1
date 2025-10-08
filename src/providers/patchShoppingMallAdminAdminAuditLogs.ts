import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
  const { admin, body } = props;
  // Pagination defaults, input normalization, strictly typed
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 100;
  const page = rawPage < 1 ? 1 : rawPage;
  const limit = rawLimit < 1 ? 100 : rawLimit;
  const skip = (page - 1) * limit;
  // Permitted sort fields for summary
  const SORTABLE_FIELDS = [
    "created_at",
    "log_level",
    "domain",
    "audit_event_type",
    "shopping_mall_admin_id",
    "id",
  ];
  const sortField =
    body.sort_by && SORTABLE_FIELDS.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order: "asc" | "desc" = body.desc === false ? "asc" : "desc";

  // WHERE filter composition
  const where: Record<string, any> = {
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { shopping_mall_admin_id: body.admin_id }),
    ...(body.audit_event_type !== undefined &&
      body.audit_event_type !== null && {
        audit_event_type: body.audit_event_type,
      }),
    ...(body.domain !== undefined &&
      body.domain !== null && { domain: body.domain }),
    ...(body.log_level !== undefined &&
      body.log_level !== null && { log_level: body.log_level }),
    ...(body.created_at_min !== undefined &&
      body.created_at_min !== null && {
        created_at: {
          ...(body.created_at_min && { gte: body.created_at_min }),
          ...(body.created_at_max && { lte: body.created_at_max }),
        },
      }),
    // If only created_at_max specified
    ...(body.created_at_min === undefined &&
      body.created_at_max !== undefined &&
      body.created_at_max !== null && {
        created_at: { lte: body.created_at_max },
      }),
  };
  // Keyword filter (q): match audit_event_type, domain, log_level or event_context_json
  // Only use contains, never mode: 'insensitive' for cross-DB compatibility
  if (body.q !== undefined && body.q !== null && String(body.q).length > 0) {
    where.OR = [
      { audit_event_type: { contains: body.q } },
      { domain: { contains: body.q } },
      { log_level: { contains: body.q } },
      { event_context_json: { contains: body.q } },
    ];
  }

  // DB query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        audit_event_type: true,
        domain: true,
        log_level: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admin_audit_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_admin_id: row.shopping_mall_admin_id,
    audit_event_type: row.audit_event_type,
    domain: row.domain,
    log_level: row.log_level,
    created_at: toISOStringSafe(row.created_at),
  }));

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
