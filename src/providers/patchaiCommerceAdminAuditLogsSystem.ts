import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAuditLogsSystem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAuditLogsSystem";
import { IPageIAiCommerceAuditLogsSystem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceAuditLogsSystem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve system audit logs (ai_commerce_audit_logs_system).
 *
 * Retrieves a paginated, searchable list of audit log entries from the
 * ai_commerce_audit_logs_system table for system configuration events,
 * administrative actions, and template version changes. Only admin role users
 * may access full audit log data.
 *
 * Provides advanced search/filter capabilities to discover audit log entries
 * according to parameters such as event type, actor, target table, or creation
 * date. Supports complex filtering, pagination, and sorting.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator performing the query
 * @param props.body - Advanced search criteria, pagination, and sort parameters
 * @returns Paginated collection of IAiCommerceAuditLogsSystem matching the
 *   search options
 * @throws {Error} On malformed search filters, pagination, or sort parameters
 */
export async function patchaiCommerceAdminAuditLogsSystem(props: {
  admin: AdminPayload;
  body: IAiCommerceAuditLogsSystem.IRequest;
}): Promise<IPageIAiCommerceAuditLogsSystem> {
  const { body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic WHERE filter
  const where = {
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && { actor_id: body.actor_id }),
    ...(body.target_table !== undefined &&
      body.target_table !== null && { target_table: body.target_table }),
    ...(body.target_id !== undefined &&
      body.target_id !== null && { target_id: body.target_id }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  // Validate allowed sort fields
  const allowedSortFields = [
    "created_at",
    "event_type",
    "actor_id",
    "target_table",
    "target_id",
  ];
  const sortBy: string =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDir: "asc" | "desc" = body.sort_dir === "asc" ? "asc" : "desc";

  // Fetch results and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_audit_logs_system.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_audit_logs_system.count({ where }),
  ]);

  // Map database rows to API DTO, handling nullable fields and branding
  const data = rows.map(
    (row): IAiCommerceAuditLogsSystem => ({
      id: row.id,
      event_type: row.event_type,
      actor_id: row.actor_id,
      target_table: row.target_table,
      target_id: row.target_id,
      before: row.before === null ? undefined : row.before,
      after: row.after === null ? undefined : row.after,
      created_at: toISOStringSafe(row.created_at),
    }),
  );

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
