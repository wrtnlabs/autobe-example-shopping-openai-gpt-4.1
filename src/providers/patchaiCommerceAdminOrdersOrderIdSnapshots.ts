import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderSnapshotLog";
import { IPageIAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderSnapshotLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list all historical snapshot logs for a specific order from
 * ai_commerce_order_snapshot_logs.
 *
 * Retrieves a paginated, filterable list of all historical order state
 * snapshots (via ai_commerce_order_snapshot_logs) for the specified orderId.
 * This endpoint supports advanced filtering by capture type, actor, and date
 * ranges, and is intended for compliance, audit, and troubleshooting
 * scenarios.
 *
 * Only system administrators (admin) may call this endpoint. If the order does
 * not exist, an error is thrown. All result dates are returned in strict ISO
 * 8601 string format. Pagination is supported.
 *
 * @param props - Parameters for the snapshot search operation.
 * @param props.admin - The authenticated admin performing the audit/search.
 * @param props.orderId - The UUID of the target order to query snapshots for.
 * @param props.body - Search filters and pagination options for the snapshot
 *   log query.
 * @returns Paginated list of order snapshot logs matching specified filters, as
 *   IPageIAiCommerceOrderSnapshotLog.
 * @throws Error when the order does not exist, or database errors occur.
 */
export async function patchaiCommerceAdminOrdersOrderIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderSnapshotLog.IRequest;
}): Promise<IPageIAiCommerceOrderSnapshotLog> {
  // 1. Ensure the order exists
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true },
  });
  if (!order) throw new Error("Order not found");

  // 2. Parse filters from request body
  const body = props.body ?? {};
  const pageValue = body.page ?? 1;
  const limitValue = body.limit ?? 20;
  const page = Number(pageValue);
  const limit = Number(limitValue);

  // 3. Build Prisma where clause
  const where = {
    order_id: props.orderId,
    ...(body.snapshotType !== undefined &&
      body.snapshotType !== null && { capture_type: body.snapshotType }),
    ...(body.actorId !== undefined &&
      body.actorId !== null && { actor_id: body.actorId }),
    ...((body.fromDate !== undefined && body.fromDate !== null) ||
    (body.toDate !== undefined && body.toDate !== null)
      ? {
          captured_at: {
            ...(body.fromDate !== undefined &&
              body.fromDate !== null && { gte: body.fromDate }),
            ...(body.toDate !== undefined &&
              body.toDate !== null && { lte: body.toDate }),
          },
        }
      : {}),
  };

  // 4. Query total count + page results in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.count({ where }),
    MyGlobal.prisma.ai_commerce_order_snapshot_logs.findMany({
      where,
      orderBy: { captured_at: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // 5. Format response
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / (limit || 1)),
  };
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    capture_type: row.capture_type,
    actor_id: row.actor_id,
    captured_at: toISOStringSafe(row.captured_at),
    entity_json: row.entity_json,
  }));
  return { pagination, data };
}
