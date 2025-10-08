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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IRequest;
}): Promise<IPageIShoppingMallOrderShipment> {
  const { customer, orderId, body } = props;

  // Authorization: order must exist and belong to this customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or not accessible", 404);
  }

  // Parse and normalize input filters
  const {
    status,
    carrier,
    tracking_number,
    created_from,
    created_to,
    dispatched_from,
    dispatched_to,
    delivered_from,
    delivered_to,
    sort_by,
    sort_order,
    page,
    limit,
  } = body;
  const take = Math.min(Number(limit ?? 20), 100);
  const current = Number(page ?? 1);
  const skip = (current - 1) * take;

  // Supported sorting fields only
  const ORDER_FIELDS = ["created_at", "dispatched_at", "delivered_at"];
  const sortField =
    typeof sort_by === "string" && ORDER_FIELDS.indexOf(sort_by) !== -1
      ? sort_by
      : "created_at";
  const sortDirection = sort_order === "asc" ? "asc" : "desc";

  // Build where clause for Prisma
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(status !== undefined && status !== null && { status }),
    ...(carrier !== undefined && carrier !== null && { carrier }),
    ...(tracking_number !== undefined &&
      tracking_number !== null && {
        tracking_number: { contains: tracking_number },
      }),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined && { gte: created_from }),
            ...(created_to !== undefined && { lte: created_to }),
          },
        }
      : {}),
    ...(dispatched_from !== undefined || dispatched_to !== undefined
      ? {
          dispatched_at: {
            ...(dispatched_from !== undefined && { gte: dispatched_from }),
            ...(dispatched_to !== undefined && { lte: dispatched_to }),
          },
        }
      : {}),
    ...(delivered_from !== undefined || delivered_to !== undefined
      ? {
          delivered_at: {
            ...(delivered_from !== undefined && { gte: delivered_from }),
            ...(delivered_to !== undefined && { lte: delivered_to }),
          },
        }
      : {}),
  };

  // Query for rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_shipments.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_order_shipments.count({ where }),
  ]);

  // Map each record to DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shipment_number: row.shipment_number,
    carrier: row.carrier,
    tracking_number:
      row.tracking_number !== null && row.tracking_number !== undefined
        ? row.tracking_number
        : undefined,
    status: row.status,
    dispatched_at:
      row.dispatched_at !== null && row.dispatched_at !== undefined
        ? toISOStringSafe(row.dispatched_at)
        : undefined,
    delivered_at:
      row.delivered_at !== null && row.delivered_at !== undefined
        ? toISOStringSafe(row.delivered_at)
        : undefined,
    remark:
      row.remark !== null && row.remark !== undefined ? row.remark : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: current,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
