import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment> {
  const { seller, orderId, body } = props;

  // Authorization: ensure order exists and is linked to this seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId, deleted_at: null },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "You are not authorized to access this order's shipments",
      403,
    );
  }

  // Build where clause from filter parameters
  const where: Record<string, any> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.carrier !== undefined &&
      body.carrier !== null && { carrier: body.carrier }),
    ...(body.tracking_number !== undefined &&
      body.tracking_number !== null && {
        tracking_number: { contains: body.tracking_number },
      }),
  };

  // Date range filters (created_at)
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    where.created_at = {};
    if (body.created_from !== undefined && body.created_from !== null) {
      where.created_at.gte = body.created_from;
    }
    if (body.created_to !== undefined && body.created_to !== null) {
      where.created_at.lte = body.created_to;
    }
  }
  // Date range filters (dispatched_at)
  if (
    (body.dispatched_from !== undefined && body.dispatched_from !== null) ||
    (body.dispatched_to !== undefined && body.dispatched_to !== null)
  ) {
    where.dispatched_at = {};
    if (body.dispatched_from !== undefined && body.dispatched_from !== null) {
      where.dispatched_at.gte = body.dispatched_from;
    }
    if (body.dispatched_to !== undefined && body.dispatched_to !== null) {
      where.dispatched_at.lte = body.dispatched_to;
    }
  }
  // Date range filters (delivered_at)
  if (
    (body.delivered_from !== undefined && body.delivered_from !== null) ||
    (body.delivered_to !== undefined && body.delivered_to !== null)
  ) {
    where.delivered_at = {};
    if (body.delivered_from !== undefined && body.delivered_from !== null) {
      where.delivered_at.gte = body.delivered_from;
    }
    if (body.delivered_to !== undefined && body.delivered_to !== null) {
      where.delivered_at.lte = body.delivered_to;
    }
  }

  // Sorting
  const allowedSortFields = ["created_at", "dispatched_at", "delivered_at"];
  const sort_by =
    body.sort_by !== undefined &&
    body.sort_by !== null &&
    allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Fetch total count and paged data in parallel
  const [total, items] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.count({ where }),
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
  ]);

  // Map to IShoppingMallOrderShipment
  const data = items.map((s) => ({
    id: s.id,
    shopping_mall_order_id: s.shopping_mall_order_id,
    shipment_number: s.shipment_number,
    carrier: s.carrier,
    tracking_number:
      s.tracking_number === null || s.tracking_number === undefined
        ? undefined
        : s.tracking_number,
    status: s.status,
    dispatched_at: s.dispatched_at
      ? toISOStringSafe(s.dispatched_at)
      : undefined,
    delivered_at: s.delivered_at ? toISOStringSafe(s.delivered_at) : undefined,
    remark: s.remark === null || s.remark === undefined ? undefined : s.remark,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
    deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
