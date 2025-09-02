import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderIncident";
import { IPageIShoppingMallAiBackendOrderIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderIncident";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Lists incidents (fraud, dispute, compliance) for an order, including current
 * and historical events.
 *
 * Retrieves all incidents and compliance records related to an order, for
 * review by compliance staff, admins, or the record owner. Includes fraud
 * incidents, disputes, customer escalations, and other exceptional events
 * linked to the order. All records are returned with business context,
 * severity, event time, resolution details, and supporting metadata. Proper
 * authorization is enforced to ensure data privacy and role-based access.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.orderId - The UUID of the order whose incidents are being listed
 * @param props.body - Incident search/filter parameters (supports pagination
 *   and sorting)
 * @returns Paginated list of order incident records matching the criteria
 * @throws {Error} When the order does not exist
 * @throws {Error} When the customer is not authorized to access the requested
 *   order
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_incidents(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderIncident.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderIncident> {
  const { customer, orderId, body } = props;

  // 1. Authorization: Ensure order exists & belongs to requesting customer
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    });
  if (!order) throw new Error("Order not found");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error(
      "Forbidden: You are not authorized to view incidents for this order",
    );
  }

  // 2. Build where clause for incidents (schema fields only)
  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    ...(body.incident_type !== undefined && {
      incident_type: body.incident_type,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...((body.from !== undefined || body.to !== undefined) && {
      event_at: {
        ...(body.from !== undefined && { gte: body.from }),
        ...(body.to !== undefined && { lte: body.to }),
      },
    }),
  };

  // 3. Pagination handling
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Query: fetch paged result & count total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_incidents.findMany({
      where,
      orderBy: { event_at: "desc" as const },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_ai_backend_order_id: true,
        incident_type: true,
        context: true,
        event_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_incidents.count({ where }),
  ]);

  // 5. Map result to DTO with correct date conversions
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_order_id: row.shopping_mall_ai_backend_order_id,
      incident_type: row.incident_type,
      context: row.context ?? null,
      event_at: toISOStringSafe(row.event_at),
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
