import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { IPageIAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSubOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a paginated, filtered list of sub-orders for an order
 * (ai_commerce_sub_orders).
 *
 * This operation retrieves a paginated and filtered list of sub-orders
 * associated with a specific order, using the ai_commerce_sub_orders table.
 * Useful in multi-seller, split-shipment, and administrative business flows for
 * managing fulfillment or vendor-specific sub-processes. Supports advanced
 * filtering, search, and paging for operational dashboards and support tools.
 *
 * Authorization: Buyer must own the parent order (order.buyer_id === buyer.id).
 *
 * @param props - Request properties
 * @param props.buyer - The authenticated buyer making the request
 * @param props.orderId - UUID of the parent order for which sub-orders are
 *   listed
 * @param props.body - Request body containing search, filter, and paging
 *   parameters
 * @returns Paginated list of sub-orders matching the request criteria for the
 *   parent order
 * @throws {Error} When the order does not exist or does not belong to the
 *   authenticated buyer
 */
export async function patchaiCommerceBuyerOrdersOrderIdSubOrders(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrder.IRequest;
}): Promise<IPageIAiCommerceSubOrder> {
  const { buyer, orderId, body } = props;

  // Step 1: Ensure the buyer owns the specified order
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { buyer_id: true },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error("Order not found or unauthorized");
  }

  // Step 2: Build filtering conditions
  const where = {
    order_id: orderId,
    deleted_at: null,
    ...(body.seller_id !== undefined && { seller_id: body.seller_id }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.shipping_method !== undefined && {
      shipping_method: body.shipping_method,
    }),
    ...(body.tracking_number !== undefined && {
      tracking_number: { contains: body.tracking_number },
    }),
    ...(body.from_date !== undefined || body.to_date !== undefined
      ? {
          created_at: {
            ...(body.from_date !== undefined && { gte: body.from_date }),
            ...(body.to_date !== undefined && { lte: body.to_date }),
          },
        }
      : {}),
  };

  // Step 3: Setup pagination variables
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 4: Query sub-orders and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_sub_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_sub_orders.count({ where }),
  ]);

  // Step 5: Map results to output DTO, handling all date conversions
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    seller_id: row.seller_id,
    suborder_code: row.suborder_code,
    status: row.status,
    shipping_method:
      row.shipping_method === null ? undefined : row.shipping_method,
    tracking_number:
      row.tracking_number === null ? undefined : row.tracking_number,
    total_price: row.total_price,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

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
