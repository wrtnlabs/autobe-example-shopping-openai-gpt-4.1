import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDeliveryEvent";
import { IPageIShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDeliveryEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve delivery event logs for a specific shipment of an order (paginated).
 *
 * Retrieve a paginated list of status update events, checkpoints, and exception
 * logs for a given delivery event within a specific order. This operation
 * allows logistics managers, administrators, or authorized customer service
 * agents to monitor and audit the full timeline of delivery for compliance,
 * performance analysis, or dispute resolution purposes.
 *
 * Filtering and sorting can be applied based on event type, logged_at, or
 * keyword within event_context. The operation supports business and regulatory
 * requirements, ensuring immutable delivery evidence records. Security is
 * enforced to ensure only authorized users can access complete event logs. Each
 * response includes full event metadata, including creation and logged_at
 * timestamps, event_type codes, and detailed event_context (if any).
 *
 * Expected errors include not found (if order or delivery is missing),
 * forbidden (if user lacks privileges), and validation errors for invalid IDs.
 * Operation may be linked from shipment tracking UIs or administrative
 * dashboards.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload
 * @param props.orderId - Order ID referencing the parent order
 * @param props.deliveryId - Delivery ID for which events are being queried
 *   (must belong to orderId)
 * @param props.body - Optional filters and pagination/sorting for event list
 *   query
 * @returns Paginated list of delivery events matching query/filters
 * @throws {Error} If delivery does not exist or does not belong to the given
 *   order
 * @throws {Error} If user does not have admin privileges
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_deliveries_$deliveryId_events(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderDeliveryEvent.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderDeliveryEvent> {
  const { admin, orderId, deliveryId, body } = props;

  // 1. Authorization: ensure admin is active (already enforced by AdminAuth decorator in controller)
  // Double-checking is not needed here; enforced at controller level.

  // 2. Confirm the delivery exists and is associated with the requested order
  const delivery =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        shopping_mall_ai_backend_order_id: true,
      },
    });
  if (!delivery || delivery.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Delivery not found or order association mismatch");
  }

  // 3. Prepare filter conditions
  const where = {
    shopping_mall_ai_backend_order_delivery_id: deliveryId,
    ...(body.eventType !== undefined &&
      body.eventType !== null && {
        event_type: body.eventType,
      }),
    ...((body.startDate !== undefined || body.endDate !== undefined) && {
      logged_at: {
        ...(body.startDate !== undefined &&
          body.startDate !== null && { gte: body.startDate }),
        ...(body.endDate !== undefined &&
          body.endDate !== null && { lte: body.endDate }),
      },
    }),
  };

  // 4. Pagination (safely strip brand types)
  const page = body.page && body.page >= 1 ? Number(body.page) : 1;
  const limit = body.limit && body.limit > 0 ? Number(body.limit) : 20;

  // 5. Sorting
  const allowedSortFields = ["created_at", "logged_at"];
  const sortBy = allowedSortFields.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "logged_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // 6. Fetch total matching events
  const total =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_delivery_events.count({
      where,
    });

  // 7. Fetch paged, sorted events
  const rows =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_delivery_events.findMany(
      {
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

  // 8. Map result rows to DTO, applying toISOStringSafe to all date fields
  const data: IShoppingMallAiBackendOrderDeliveryEvent[] = rows.map(
    (event) => ({
      id: event.id as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_order_delivery_id:
        event.shopping_mall_ai_backend_order_delivery_id as string &
          tags.Format<"uuid">,
      event_type: event.event_type,
      event_context: event.event_context ?? null,
      logged_at: toISOStringSafe(event.logged_at),
      created_at: toISOStringSafe(event.created_at),
    }),
  );

  return {
    pagination: {
      current: page as number & tags.Type<"int32">,
      limit: limit as number & tags.Type<"int32">,
      records: total as number & tags.Type<"int32">,
      pages: Math.ceil(total / limit) as number & tags.Type<"int32">,
    },
    data,
  };
}
