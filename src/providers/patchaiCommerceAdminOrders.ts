import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { IPageIAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Advanced search and retrieval of a filtered, paginated list of orders
 * (ai_commerce_orders)
 *
 * Retrieves a paginated and filtered list of orders, supporting advanced
 * filtering, search, and sorting. Only accessible to authenticated admins.
 *
 * @param props - Object containing:
 *
 *   - Admin: Authenticated admin payload, required to access this endpoint.
 *   - Body: IAiCommerceOrder.IRequest filter/search parameters, pagination, and
 *       sort details.
 *
 * @returns IPageIAiCommerceOrder Paginated page of orders matching query with
 *   full metadata.
 * @throws {Error} Unauthorized if caller is not an authenticated admin.
 */
export async function patchaiCommerceAdminOrders(props: {
  admin: AdminPayload;
  body: IAiCommerceOrder.IRequest;
}): Promise<IPageIAiCommerceOrder> {
  const { admin, body } = props;
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: admin only");
  }
  const rawPage = body.page !== undefined ? body.page : 1;
  const rawLimit = body.limit !== undefined ? body.limit : 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (rawPage - 1) * limit;

  // Allowed sort fields for orders
  const allowedSortFields = [
    "created_at",
    "status",
    "order_code",
    "total_price",
  ];
  const sort_by =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_dir = body.sort_dir === "asc" ? "asc" : "desc";

  // Build date range for created_at window
  let createdAt: { gte?: string; lte?: string } = {};
  if (body.from_date !== undefined && body.from_date !== null)
    createdAt.gte = body.from_date;
  if (body.to_date !== undefined && body.to_date !== null)
    createdAt.lte = body.to_date;

  // total_price range
  let totalPrice: { gte?: number; lte?: number } = {};
  if (body.min_total_price !== undefined && body.min_total_price !== null) {
    totalPrice.gte = body.min_total_price;
  }
  if (body.max_total_price !== undefined && body.max_total_price !== null) {
    totalPrice.lte = body.max_total_price;
  }

  // Query construction
  const where = {
    deleted_at: null,
    ...(body.order_code !== undefined && body.order_code !== null
      ? { order_code: { contains: body.order_code } }
      : {}),
    ...(body.buyer_id !== undefined && body.buyer_id !== null
      ? { buyer_id: body.buyer_id }
      : {}),
    ...(body.channel_id !== undefined && body.channel_id !== null
      ? { channel_id: body.channel_id }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...(body.business_status !== undefined && body.business_status !== null
      ? { business_status: body.business_status }
      : {}),
    ...(Object.keys(totalPrice).length ? { total_price: totalPrice } : {}),
    ...(Object.keys(createdAt).length ? { created_at: createdAt } : {}),
  };

  // Fetch data and count in parallel
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_orders.findMany({
      where: where,
      orderBy: { [sort_by]: sort_dir },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_orders.count({ where }),
  ]);

  // Map results to IAiCommerceOrder, converting all dates
  const data: IAiCommerceOrder[] = orders.map((order) => {
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      order.created_at,
    );
    const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      order.updated_at,
    );
    const deletedAt: (string & tags.Format<"date-time">) | null | undefined =
      order.deleted_at !== null && order.deleted_at !== undefined
        ? toISOStringSafe(order.deleted_at)
        : undefined;
    return {
      id: order.id,
      buyer_id: order.buyer_id,
      channel_id: order.channel_id,
      order_code: order.order_code,
      status: order.status,
      business_status:
        order.business_status !== undefined && order.business_status !== null
          ? order.business_status
          : undefined,
      total_price: order.total_price,
      paid_amount: order.paid_amount,
      currency: order.currency,
      address_snapshot_id: order.address_snapshot_id,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
    };
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    pagination: {
      current: Number(rawPage),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data,
  };
}
