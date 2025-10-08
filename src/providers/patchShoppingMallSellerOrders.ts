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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const { seller, body } = props;
  // Defaults
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Search/sort fields (defaults)
  const sortField = body.sort_by ?? "placed_at";
  const sortDirection = body.sort_direction ?? "desc";
  // Build where filters for Prisma
  const where = {
    deleted_at: null,
    shopping_mall_seller_id: seller.id,
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
    ...(body.placed_at_from !== undefined && body.placed_at_from !== null
      ? {
          placed_at: {
            gte: body.placed_at_from,
            ...(body.placed_at_to !== undefined &&
              body.placed_at_to !== null && {
                lte: body.placed_at_to,
              }),
          },
        }
      : body.placed_at_to !== undefined && body.placed_at_to !== null
        ? {
            placed_at: { lte: body.placed_at_to },
          }
        : {}),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_customer_id: body.customer_id,
      }),
    ...(body.currency !== undefined &&
      body.currency !== null && {
        currency: body.currency,
      }),
    ...(body.min_total !== undefined &&
      body.max_total !== undefined && {
        order_total: {
          gte: body.min_total,
          lte: body.max_total,
        },
      }),
    ...(body.min_total !== undefined &&
      body.max_total === undefined && {
        order_total: { gte: body.min_total },
      }),
    ...(body.max_total !== undefined &&
      body.min_total === undefined && {
        order_total: { lte: body.max_total },
      }),
  };
  // Query orders and count in parallel
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
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
  // Map results to ISummary DTO
  const data = orders.map((order) => ({
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_seller_id: order.shopping_mall_seller_id ?? null,
    order_number: order.order_number,
    status: order.status,
    order_total: order.order_total,
    currency: order.currency,
    placed_at: toISOStringSafe(order.placed_at),
    paid_at:
      order.paid_at !== null && order.paid_at !== undefined
        ? toISOStringSafe(order.paid_at)
        : null,
    fulfilled_at:
      order.fulfilled_at !== null && order.fulfilled_at !== undefined
        ? toISOStringSafe(order.fulfilled_at)
        : null,
  }));
  // Calculate pages
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
