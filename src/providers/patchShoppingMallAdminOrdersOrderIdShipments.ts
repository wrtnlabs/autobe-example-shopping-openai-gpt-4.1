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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment> {
  // 1. Validate the order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // 2. Pagination and limit
  const { body } = props;
  const page = body.page !== undefined ? Number(body.page) : 1;
  let rawLimit = body.limit !== undefined ? Number(body.limit) : 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;
  // 3. Build where clause
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.carrier !== undefined && { carrier: body.carrier }),
    ...(body.tracking_number !== undefined &&
      body.tracking_number !== null &&
      body.tracking_number.length > 0 && {
        tracking_number: { contains: body.tracking_number },
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.dispatched_from !== undefined || body.dispatched_to !== undefined
      ? {
          dispatched_at: {
            ...(body.dispatched_from !== undefined && {
              gte: body.dispatched_from,
            }),
            ...(body.dispatched_to !== undefined && {
              lte: body.dispatched_to,
            }),
          },
        }
      : {}),
    ...(body.delivered_from !== undefined || body.delivered_to !== undefined
      ? {
          delivered_at: {
            ...(body.delivered_from !== undefined && {
              gte: body.delivered_from,
            }),
            ...(body.delivered_to !== undefined && { lte: body.delivered_to }),
          },
        }
      : {}),
  };
  // 4. Sort
  const validSortFields = ["created_at", "dispatched_at", "delivered_at"];
  const sort_by = validSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by as "created_at" | "dispatched_at" | "delivered_at")
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";
  // 5. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_shipments.count({ where }),
  ]);
  // 6. Map to DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shipment_number: row.shipment_number,
    carrier: row.carrier,
    tracking_number: row.tracking_number ?? undefined,
    status: row.status,
    dispatched_at: row.dispatched_at
      ? toISOStringSafe(row.dispatched_at)
      : undefined,
    delivered_at: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
    remark: row.remark ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));
  // 7. Pagination result
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
