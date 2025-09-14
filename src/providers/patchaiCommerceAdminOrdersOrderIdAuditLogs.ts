import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAuditLog";
import { IPageIAiCommerceOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated list of audit logs for a specific order from the
 * ai_commerce_order_audit_logs table.
 *
 * This endpoint allows an administrator to retrieve audit logs for a given
 * order, with optional filtering by event type, actor, and date range. The
 * operation supports pagination, descending order by event timestamp, and
 * exposes all event metadata required for compliance audit and traceability.
 * All date/time fields are returned as ISO 8601 strings.
 *
 * Authorization: Requires authenticated admin privileges. The admin context is
 * validated upstream using the AdminPayload parameter.
 *
 * @param props - The properties for the request
 * @param props.admin - Authenticated admin making the request
 * @param props.orderId - The unique order ID whose audit logs are being queried
 * @param props.body - Request body containing filter and pagination options
 * @returns Paginated audit log record list, conforming to
 *   IPageIAiCommerceOrderAuditLog
 * @throws {Error} If database or parameter logic fails
 */
export async function patchaiCommerceAdminOrdersOrderIdAuditLogs(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAuditLog.IRequest;
}): Promise<IPageIAiCommerceOrderAuditLog> {
  const { admin, orderId, body } = props;

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build 'occurred_at' filter range as an object
  const occurredAt: { gte?: string; lte?: string } = {};
  if (body.fromDate !== undefined && body.fromDate !== null) {
    occurredAt.gte = body.fromDate;
  }
  if (body.toDate !== undefined && body.toDate !== null) {
    occurredAt.lte = body.toDate;
  }

  // Construct main Prisma where clause
  const where = {
    order_id: orderId,
    ...(body.event !== undefined &&
      body.event !== null && { event_type: body.event }),
    ...(body.actorId !== undefined &&
      body.actorId !== null && { actor_id: body.actorId }),
    ...(Object.keys(occurredAt).length > 0 ? { occurred_at: occurredAt } : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_audit_logs.findMany({
      where,
      orderBy: { occurred_at: "desc" },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_order_audit_logs.count({ where }),
  ]);

  // Map to IAiCommerceOrderAuditLog array
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    event_type: row.event_type,
    actor_id: row.actor_id,
    event_note: row.event_note === null ? undefined : row.event_note,
    occurred_at: toISOStringSafe(row.occurred_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(Number(total) / Number(limit))),
    },
    data,
  };
}
