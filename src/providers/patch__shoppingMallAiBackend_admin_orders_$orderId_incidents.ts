import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderIncident";
import { IPageIShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderIncident";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Lists all incident or compliance-related records attached to a given order.
 *
 * Enables audit, fraud, and compliance staff (as well as the owning
 * customer/admin) to monitor all open and historical incidents such as fraud
 * investigations, disputes, chargebacks, and compliance events. Tied to the
 * Orders and OrderIncidents Prisma models, this operation supports pagination,
 * filtering, and audit review, returning a paginated list of incident entries
 * grouped by status or relevance.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (authorization checked by
 *   decorator)
 * @param props.orderId - Order ID whose incidents are being listed
 * @param props.body - Incident search/filter parameters, supports pagination
 *   and sorting
 * @returns Paginated incident and compliance log list for the order
 * @throws {Error} If database access fails
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_incidents(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderIncident.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderIncident> {
  const { admin, orderId, body } = props;
  // Authorization enforcement: already checked at entry by AdminAuth

  // Construct where clause with supported filters
  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.incident_type && { incident_type: body.incident_type }),
    ...(body.status && { status: body.status }),
    ...(body.from || body.to
      ? {
          event_at: {
            ...(body.from && { gte: body.from }),
            ...(body.to && { lte: body.to }),
          },
        }
      : {}),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Fetch incidents and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_incidents.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_incidents.count({ where }),
  ]);

  const incidents = rows.map(
    (row): IShoppingMallAiBackendOrderIncident => ({
      id: row.id,
      shopping_mall_ai_backend_order_id: row.shopping_mall_ai_backend_order_id,
      incident_type: row.incident_type,
      context: row.context,
      event_at: toISOStringSafe(row.event_at),
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: incidents,
  };
}
