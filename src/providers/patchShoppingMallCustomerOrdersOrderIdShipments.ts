import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  // Authorize: ensure the order belongs to this customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found or access denied", 403);
  }

  // Pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Filters
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shipment_code !== undefined && {
      shipment_code: props.body.shipment_code,
    }),
    ...(props.body.shopping_mall_seller_id !== undefined && {
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
    }),
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined && {
              gte: props.body.created_from,
            }),
            ...(props.body.created_to !== undefined && {
              lte: props.body.created_to,
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.shopping_mall_order_id,
    seller_id: row.shopping_mall_seller_id,
    shipment_code: row.shipment_code,
    external_tracking_number: row.external_tracking_number ?? undefined,
    status: row.status,
    carrier: row.carrier ?? undefined,
    requested_at: row.requested_at
      ? toISOStringSafe(row.requested_at)
      : undefined,
    shipped_at: row.shipped_at ? toISOStringSafe(row.shipped_at) : undefined,
    delivered_at: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
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
