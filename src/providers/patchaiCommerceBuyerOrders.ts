import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { IPageIAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve a filtered, paginated list of purchase orders (ai_commerce_orders
 * table)
 *
 * This function returns a paginated list of order summaries for the
 * authenticated buyer, supporting advanced search and filtering. Permitted
 * filters include order code (partial), buyer ID (enforced to current buyer),
 * channel ID, status, business status, date range, and total price range.
 * Sorting and pagination parameters are fully supported. Only active
 * (non-deleted) orders for the current buyer can be retrieved.
 *
 * @param props - The input properties
 * @param props.buyer - The authenticated BuyerPayload
 * @param props.body - The IAiCommerceOrder.IRequest filter and paging options
 * @returns Paginated list of order summaries and page meta
 * @throws {Error} If request parameters are invalid or query fails
 */
export async function patchaiCommerceBuyerOrders(props: {
  buyer: BuyerPayload;
  body: IAiCommerceOrder.IRequest;
}): Promise<IPageIAiCommerceOrder.ISummary> {
  // Pagination with safe defaults, limit 1-100
  const page =
    props.body.page !== undefined && props.body.page !== null
      ? props.body.page
      : 1;
  const limitRaw =
    props.body.limit !== undefined && props.body.limit !== null
      ? props.body.limit
      : 20;
  const limit = limitRaw > 100 ? 100 : limitRaw;
  const skip = (page - 1) * limit;

  // Allowed sort by fields
  const allowedSortFields = [
    "created_at",
    "status",
    "order_code",
    "total_price",
    "updated_at",
    "paid_amount",
    "currency",
  ];
  const sort_by =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sort_dir = props.body.sort_dir === "asc" ? "asc" : "desc";

  // Build where clause with safe type patterns
  const createdAtClause =
    (props.body.from_date !== undefined && props.body.from_date !== null) ||
    (props.body.to_date !== undefined && props.body.to_date !== null)
      ? {
          created_at: {
            ...(props.body.from_date !== undefined &&
              props.body.from_date !== null && { gte: props.body.from_date }),
            ...(props.body.to_date !== undefined &&
              props.body.to_date !== null && { lte: props.body.to_date }),
          },
        }
      : {};
  const totalPriceClause =
    (props.body.min_total_price !== undefined &&
      props.body.min_total_price !== null) ||
    (props.body.max_total_price !== undefined &&
      props.body.max_total_price !== null)
      ? {
          total_price: {
            ...(props.body.min_total_price !== undefined &&
              props.body.min_total_price !== null && {
                gte: props.body.min_total_price,
              }),
            ...(props.body.max_total_price !== undefined &&
              props.body.max_total_price !== null && {
                lte: props.body.max_total_price,
              }),
          },
        }
      : {};

  // Always constrain to current buyer
  const where = {
    deleted_at: null,
    buyer_id: props.buyer.id,
    ...(props.body.channel_id !== undefined &&
      props.body.channel_id !== null && {
        channel_id: props.body.channel_id,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.business_status !== undefined &&
      props.body.business_status !== null && {
        business_status: props.body.business_status,
      }),
    ...(props.body.order_code !== undefined &&
      props.body.order_code !== null && {
        order_code: { contains: props.body.order_code },
      }),
    ...createdAtClause,
    ...totalPriceClause,
  };

  // Query orders and count in parallel
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_orders.findMany({
      where,
      orderBy: { [sort_by]: sort_dir },
      skip,
      take: limit,
      select: {
        id: true,
        buyer_id: true,
        channel_id: true,
        order_code: true,
        status: true,
        total_price: true,
        paid_amount: true,
        currency: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_orders.count({ where }),
  ]);

  // Map orders to summary, convert date fields
  const data: IAiCommerceOrder.ISummary[] = orders.map((order) => ({
    id: order.id,
    buyer_id: order.buyer_id,
    channel_id: order.channel_id,
    order_code: order.order_code,
    status: order.status,
    total_price: order.total_price,
    paid_amount: order.paid_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
  }));

  // Build and return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
