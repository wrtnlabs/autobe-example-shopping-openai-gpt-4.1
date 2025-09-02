import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import { IPageIShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDelivery";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and list deliveries for a specific order.
 *
 * Retrieves a filtered and paginated list of delivery/shipment records for a
 * specific order, supporting multi-shipment, sorting, and real-time tracking.
 * Only returns deliveries linked to the order if owned by the authenticated
 * customer.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer making the request
 * @param props.orderId - UUID of the order to query deliveries for
 * @param props.body - Filtering, sorting, and pagination configuration
 * @returns Paginated, filtered delivery/shipment result list
 * @throws {Error} When the order does not exist or the user is not authorized
 *   to view
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_deliveries(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderDelivery.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderDelivery> {
  const { customer, orderId, body } = props;

  // 1. Authorization and order ownership check
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (!order) throw new Error("Order not found or access denied");

  // 2. Dynamic filter object for deliveries
  const deliveryWhere = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.deliveryStatus !== undefined &&
      body.deliveryStatus !== null && {
        delivery_status: body.deliveryStatus,
      }),
    ...(body.provider !== undefined &&
      body.provider !== null && {
        logistics_provider: body.provider,
      }),
    ...(body.trackingNumber !== undefined &&
      body.trackingNumber !== null && {
        tracking_number: body.trackingNumber,
      }),
    ...((body.startDate !== undefined && body.startDate !== null) ||
    (body.endDate !== undefined && body.endDate !== null)
      ? {
          OR: [
            {
              shipped_at: {
                ...(body.startDate !== undefined &&
                  body.startDate !== null && {
                    gte: body.startDate,
                  }),
                ...(body.endDate !== undefined &&
                  body.endDate !== null && {
                    lte: body.endDate,
                  }),
              },
            },
            {
              created_at: {
                ...(body.startDate !== undefined &&
                  body.startDate !== null && {
                    gte: body.startDate,
                  }),
                ...(body.endDate !== undefined &&
                  body.endDate !== null && {
                    lte: body.endDate,
                  }),
              },
            },
          ],
        }
      : {}),
  };

  // 3. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 4. Sorting
  const allowedSortFields = [
    "created_at",
    "delivered_at",
    "delivery_status",
    "updated_at",
    "shipped_at",
    "logistics_provider",
    "tracking_number",
  ];
  const sortBy =
    body.sortBy && allowedSortFields.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortDir =
    body.sortDirection === "asc" || body.sortDirection === "desc"
      ? body.sortDirection
      : "desc";

  // 5. Parallel query for data and count
  const [deliveries, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findMany({
      where: deliveryWhere,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortDir as "asc" | "desc" },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.count({
      where: deliveryWhere,
    }),
  ]);

  // 6. Transform each delivery record to IShoppingMallAiBackendOrderDelivery
  const data = deliveries.map((d) => ({
    id: d.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_order_id:
      d.shopping_mall_ai_backend_order_id as string & tags.Format<"uuid">,
    delivery_status: d.delivery_status,
    logistics_provider: d.logistics_provider ?? null,
    tracking_number: d.tracking_number ?? null,
    shipped_at: d.shipped_at ? toISOStringSafe(d.shipped_at) : null,
    delivered_at: d.delivered_at ? toISOStringSafe(d.delivered_at) : null,
    delivery_notes: d.delivery_notes ?? null,
    created_at: toISOStringSafe(d.created_at),
    updated_at: toISOStringSafe(d.updated_at),
    deleted_at: d.deleted_at ? toISOStringSafe(d.deleted_at) : null,
  }));

  // Prepare paginated result in strict format
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
