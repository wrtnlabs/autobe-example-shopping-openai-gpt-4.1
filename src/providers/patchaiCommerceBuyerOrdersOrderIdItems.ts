import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { IPageIAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and retrieve a paginated, filtered list of order items for a specific
 * order (ai_commerce_order_items).
 *
 * This API endpoint allows an authenticated buyer to view a paginated breakdown
 * of their order items, supporting advanced filter criteria and full type
 * safety. Business rules enforce that the authenticated buyer may only view
 * their own orders; all dates are output as ISO8601 strings. Filtering is
 * available by product name, delivery status, seller, quantity, and creation
 * date range. Pagination defaults to page 1, limit 20 but can be overridden by
 * input.
 *
 * @param props - Input object containing all required request context:
 *
 *   - Buyer: BuyerPayload for the current user (must match order ownership)
 *   - OrderId: order UUID to query items for
 *   - Body: Search/filter/pagination options per IAiCommerceOrderItem.IRequest
 *
 * @returns Paginated order item results for the order matching the filters
 * @throws Error if the order does not exist, does not belong to buyer, or for
 *   any forbidden access
 */
export async function patchaiCommerceBuyerOrdersOrderIdItems(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.IRequest;
}): Promise<IPageIAiCommerceOrderItem> {
  const { buyer, orderId, body } = props;
  // 1. Verify order exists and belongs to the buyer
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) throw new Error("Order not found or forbidden");

  // 2. Pagination with default fallback (page >= 1, limit >=1)
  let pageRaw = (
    body as Record<string, unknown> & { page?: number; limit?: number }
  ).page;
  let limitRaw = (body as Record<string, unknown> & { limit?: number }).limit;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw > 0 && limitRaw <= 100
      ? limitRaw
      : 20;

  // 3. Build where conditions immutably (strictly matching allowed schema fields, and never using Date objects)
  const itemWhere = {
    order_id: orderId,
    deleted_at: null,
    ...(body.product_name !== undefined &&
      body.product_name !== null && {
        name: { contains: body.product_name },
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        seller_id: body.seller_id,
      }),
    ...(body.min_quantity !== undefined &&
      body.min_quantity !== null && {
        quantity: {
          gte: body.min_quantity,
        },
      }),
    ...(body.max_quantity !== undefined &&
      body.max_quantity !== null && {
        quantity: {
          ...(body.min_quantity !== undefined && body.min_quantity !== null
            ? { gte: body.min_quantity }
            : {}),
          lte: body.max_quantity,
        },
      }),
    ...((body.created_start !== undefined && body.created_start !== null) ||
    (body.created_end !== undefined && body.created_end !== null)
      ? {
          created_at: {
            ...(body.created_start !== undefined &&
              body.created_start !== null && {
                gte: body.created_start,
              }),
            ...(body.created_end !== undefined &&
              body.created_end !== null && {
                lte: body.created_end,
              }),
          },
        }
      : {}),
  };

  // Make both queries in parallel
  const [total, records] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_items.count({ where: itemWhere }),
    MyGlobal.prisma.ai_commerce_order_items.findMany({
      where: itemWhere,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // 5. Map records to API output
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: records.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_variant_id: item.product_variant_id,
      seller_id: item.seller_id === null ? undefined : item.seller_id,
      item_code: item.item_code,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      delivery_status: item.delivery_status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
    })),
  };
}
