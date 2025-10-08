import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const body = props.body;
  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "placed_at",
    "order_total",
    "status",
    "created_at",
    "id",
  ];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "placed_at";
  const sort_direction =
    body.sort_direction === "asc" || body.sort_direction === "desc"
      ? body.sort_direction
      : "desc";

  const where = {
    deleted_at: null,
    ...(body.order_number !== undefined &&
      body.order_number !== null && {
        order_number: body.order_number,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...((body.placed_at_from !== undefined && body.placed_at_from !== null) ||
    (body.placed_at_to !== undefined && body.placed_at_to !== null)
      ? {
          placed_at: {
            ...(body.placed_at_from !== undefined &&
              body.placed_at_from !== null && {
                gte: body.placed_at_from,
              }),
            ...(body.placed_at_to !== undefined &&
              body.placed_at_to !== null && {
                lte: body.placed_at_to,
              }),
          },
        }
      : {}),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_customer_id: body.customer_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_seller_id: body.seller_id,
      }),
    ...(body.currency !== undefined &&
      body.currency !== null && {
        currency: body.currency,
      }),
    ...(body.min_total !== undefined &&
    body.min_total !== null &&
    body.max_total !== undefined &&
    body.max_total !== null
      ? {
          order_total: {
            gte: body.min_total,
            lte: body.max_total,
          },
        }
      : body.min_total !== undefined && body.min_total !== null
        ? {
            order_total: {
              gte: body.min_total,
            },
          }
        : body.max_total !== undefined && body.max_total !== null
          ? {
              order_total: {
                lte: body.max_total,
              },
            }
          : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: where,
      orderBy: {
        [sort_by]: sort_direction,
      },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_seller_id: true,
        order_number: true,
        status: true,
        order_total: true,
        currency: true,
        placed_at: true,
        paid_at: true,
        fulfilled_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((order) => ({
      id: order.id,
      shopping_mall_customer_id: order.shopping_mall_customer_id,
      shopping_mall_seller_id:
        order.shopping_mall_seller_id === null
          ? null
          : order.shopping_mall_seller_id,
      order_number: order.order_number,
      status: order.status,
      order_total: order.order_total,
      currency: order.currency,
      placed_at: toISOStringSafe(order.placed_at),
      paid_at: order.paid_at ? toISOStringSafe(order.paid_at) : null,
      fulfilled_at: order.fulfilled_at
        ? toISOStringSafe(order.fulfilled_at)
        : null,
    })),
  };
}
