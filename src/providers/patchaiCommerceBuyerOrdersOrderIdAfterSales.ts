import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { IPageIAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderAfterSales";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and list after-sales service events (ai_commerce_order_after_sales)
 * linked to an order.
 *
 * Provides a paginated, filterable list of after-sales records (returns,
 * exchanges, service, etc.) for a specific order. Ensures that the
 * authenticated buyer owns the order and can only view their own data. Supports
 * filtering by event type, status, actor, order item, note, and opened_at
 * range; paginates efficiently and structures results for monitoring
 * after-sales requests.
 *
 * @param props - Request parameters and body for after-sales search
 * @param props.buyer - Buyer making the request (must own the order)
 * @param props.orderId - Order ID whose after-sales events are to be listed
 * @param props.body - Paginated and filtered search parameters for after-sales
 *   events
 * @returns Paginated and filtered list of after-sales events for the order
 * @throws {Error} If the order does not exist or the authenticated buyer does
 *   not own it.
 */
export async function patchaiCommerceBuyerOrdersOrderIdAfterSales(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IRequest;
}): Promise<IPageIAiCommerceOrderAfterSales> {
  const { buyer, orderId, body } = props;

  // First, ensure the authenticated buyer owns the order being queried.
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { buyer_id: true },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: Buyer does not own this order.");
  }

  // Set up pagination
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  // For IPage, need: number & tags.Type<"int32"> & tags.Minimum<0>
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = Number(
    rawPage,
  ) as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = Number(
    rawLimit,
  ) as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip: number = (Number(page) - 1) * Number(limit);

  // Build dynamic where clause for filters
  const where: Record<string, unknown> = {
    order_id: orderId,
    // Optional filters
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.actor_id !== undefined && { actor_id: body.actor_id }),
    ...(body.order_item_id !== undefined && {
      order_item_id: body.order_item_id,
    }),
  };
  // Add search (currently only on 'note')
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim().length > 0
  ) {
    Object.assign(where, {
      OR: [{ note: { contains: body.search } }],
    });
  }
  // Date range filter handling
  defineOpenedAtRange: if (
    (body.from_opened_at !== undefined && body.from_opened_at !== null) ||
    (body.to_opened_at !== undefined && body.to_opened_at !== null)
  ) {
    const openedAtCond: Record<string, string> = {};
    if (body.from_opened_at !== undefined && body.from_opened_at !== null) {
      openedAtCond.gte = body.from_opened_at;
    }
    if (body.to_opened_at !== undefined && body.to_opened_at !== null) {
      openedAtCond.lte = body.to_opened_at;
    }
    Object.assign(where, {
      opened_at: openedAtCond,
    });
  }

  // Query the database and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_after_sales.findMany({
      where,
      skip,
      take: limit,
      orderBy: { opened_at: "desc" },
    }),
    MyGlobal.prisma.ai_commerce_order_after_sales.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => {
      return {
        id: row.id,
        order_id: row.order_id,
        order_item_id:
          row.order_item_id === null ? undefined : row.order_item_id,
        actor_id: row.actor_id,
        type: row.type,
        status: row.status,
        opened_at: toISOStringSafe(row.opened_at),
        closed_at:
          row.closed_at === null ? undefined : toISOStringSafe(row.closed_at),
        note: row.note === null ? undefined : row.note,
      };
    }),
  };
}
