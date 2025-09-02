import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemAuditTrail";
import { IPageIShoppingMallAiBackendSystemAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemAuditTrail";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of system audit trails from
 * shopping_mall_ai_backend_system_audit_trails.
 *
 * Retrieve a filtered and paginated list of system-level audit trail entries.
 * This operation is used for compliance reviews, incident investigations, and
 * administrative monitoring. It supports complex query capabilities including
 * filtering by event types, actors, time ranges, and full-text search of event
 * descriptions.
 *
 * The audit trail records are append-only and immutable—each record captures
 * the event type (such as config_change, access, permission changes, or
 * errors), the actor responsible, a textual business description, optional
 * machine-readable metadata, and the timestamp of occurrence.
 *
 * Only privileged admin users may invoke this operation, and all access is
 * itself auditable. Large result sets are paginated for efficiency and
 * security. If no records match the query parameters, an empty result page is
 * returned. This endpoint does not allow modification or deletion of audit
 * trail data. The results help fulfill regulatory, security, and forensic
 * requirements for the shopping mall backend.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated system admin making the request
 * @param props.body - Filtering, searching, and pagination criteria for audit
 *   entry list
 * @returns Paginated summary of audit trail records matching the filters
 * @throws {Error} When invalid query parameters are supplied
 */
export async function patch__shoppingMallAiBackend_admin_systemAuditTrails(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendSystemAuditTrail.IRequest;
}): Promise<IPageIShoppingMallAiBackendSystemAuditTrail.ISummary> {
  const { admin, body } = props;

  // Defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Filtering logic
  const where = {
    ...(body.event_type !== undefined &&
      body.event_type !== null &&
      body.event_type.length > 0 && {
        event_type: body.event_type,
      }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null &&
      body.actor_id.length > 0 && {
        actor_id: body.actor_id,
      }),
    ...(body.description !== undefined &&
      body.description !== null &&
      body.description.length > 0 && {
        description: {
          contains: body.description,
          mode: "insensitive" as const,
        },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // Only these fields are allowed for sorting
  const allowedSortFields = ["created_at", "event_type", "actor_id"] as const;
  const sort_by =
    body.sort_by !== undefined &&
    body.sort_by !== null &&
    allowedSortFields.includes(body.sort_by as any)
      ? body.sort_by
      : "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_system_audit_trails.findMany({
      where,
      orderBy: { [sort_by]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_system_audit_trails.count({
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
    data: rows.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      actor_id: row.actor_id,
      description: row.description,
      metadata: row.metadata ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
