import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { IPageIAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list order cancellations for an order
 * (ai_commerce_order_cancellations).
 *
 * This endpoint allows administrators to search, filter, paginate, and sort
 * cancellation requests for a given order. Supports searching by status, actor,
 * requested time range, and text in reason/code. Results are paginated. Only
 * accessible to authenticated admin users with global platform privileges.
 *
 * @param props - Request prop object
 * @param props.admin - Authenticated admin payload (authorization required)
 * @param props.orderId - UUID of the parent order for which cancellations are
 *   listed
 * @param props.body - Search, filter, pagination, and sorting options
 * @returns Paginated list of matching cancellation requests for the order
 * @throws {Error} For database or system errors
 */
export async function patchaiCommerceAdminOrdersOrderIdCancellations(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.IRequest;
}): Promise<IPageIAiCommerceOrderCancellation> {
  const { orderId, body } = props;

  // Page (0 or greater, default 0), Limit (1~100, default 20)
  const page = typeof body.page === "number" && body.page >= 0 ? body.page : 0;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;

  // Build requested_at filter range
  let requestedAt: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.requested_start) {
    requestedAt.gte = body.requested_start as string & tags.Format<"date-time">;
  }
  if (body.requested_end) {
    requestedAt.lte = body.requested_end as string & tags.Format<"date-time">;
  }
  const hasRequestedAt = Object.keys(requestedAt).length > 0;

  // Build where clause (no mode: "insensitive"! No contains on UUIDs!)
  const where = {
    order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
    Array.isArray(body.status) &&
    body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...(body.actor_ids !== undefined &&
    Array.isArray(body.actor_ids) &&
    body.actor_ids.length > 0
      ? { actor_id: { in: body.actor_ids } }
      : {}),
    ...(hasRequestedAt ? { requested_at: requestedAt } : {}),
    ...(body.search
      ? {
          OR: [
            { reason: { contains: body.search } },
            { cancellation_code: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Decide sort field
  const allowedSortFields = ["requested_at", "status"] as const;
  let sortBy: "requested_at" | "status" = "requested_at";
  if (body.sort_by && allowedSortFields.includes(body.sort_by as any)) {
    sortBy = body.sort_by as "requested_at" | "status";
  }
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";

  // Query DB (no Date type in input/output)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_cancellations.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: Number(page) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_order_cancellations.count({ where }),
  ]);

  // Map to strict API output (date/datetime fields via toISOStringSafe)
  const data = rows.map((row) => {
    return {
      id: row.id,
      order_id: row.order_id,
      actor_id: row.actor_id,
      cancellation_code: row.cancellation_code,
      reason:
        row.reason !== null && row.reason !== undefined
          ? row.reason
          : undefined,
      status: row.status,
      requested_at: toISOStringSafe(row.requested_at),
      approved_at:
        row.approved_at !== null && row.approved_at !== undefined
          ? toISOStringSafe(row.approved_at)
          : undefined,
      finalized_at:
        row.finalized_at !== null && row.finalized_at !== undefined
          ? toISOStringSafe(row.finalized_at)
          : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
