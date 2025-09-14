import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { IPageIAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSubOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, filtered list of sub-orders for an order
 * (ai_commerce_sub_orders).
 *
 * This API retrieves a filtered and paginated list of sub-orders belonging to
 * the parent order indicated by orderId. Supports advanced filtering by
 * seller_id, status, shipping_method, tracking_number (partial), and by
 * created_at range. Results are paginated based on page/limit in the request
 * body (default page=1, limit=20). All returned date fields are converted to
 * the correct ISO string type.
 *
 * Requires admin authorization for global access to all sub-orders.
 *
 * @param props - Object parameter containing:
 *
 *   - Admin: Authenticated AdminPayload
 *   - OrderId: UUID of the parent order
 *   - Body: Search, filter, and paging parameters (IAiCommerceSubOrder.IRequest)
 *
 * @returns Paginated list of sub-orders matching the filter/sort/pagination
 * @throws {Error} If any unexpected failure or type incompatibility occurs
 */
export async function patchaiCommerceAdminOrdersOrderIdSubOrders(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrder.IRequest;
}): Promise<IPageIAiCommerceSubOrder> {
  const { orderId, body } = props;

  // Pagination defaults
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  // Remove typia tags for safe arithmetic
  const page: number = Number(pageRaw);
  const limit: number = Number(limitRaw);
  const skip: number = (page - 1) * limit;

  // Build where filter inline, never reuse or create intermediate variables.
  const where = {
    order_id: orderId,
    deleted_at: null,
    // Optional filters
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        seller_id: body.seller_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.shipping_method !== undefined &&
      body.shipping_method !== null && {
        shipping_method: body.shipping_method,
      }),
    ...(body.tracking_number !== undefined &&
      body.tracking_number !== null && {
        tracking_number: {
          contains: body.tracking_number,
        },
      }),
    // Date range filter
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
  };

  // Fetch results and total in parallel.
  const [subOrders, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_sub_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_sub_orders.count({
      where,
    }),
  ]);

  // Map result to strict IAiCommerceSubOrder[]
  const data = subOrders.map((row) => {
    return {
      id: row.id,
      order_id: row.order_id,
      seller_id: row.seller_id,
      suborder_code: row.suborder_code,
      status: row.status,
      shipping_method: row.shipping_method ?? undefined,
      tracking_number: row.tracking_number ?? undefined,
      total_price: row.total_price,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
  });

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
