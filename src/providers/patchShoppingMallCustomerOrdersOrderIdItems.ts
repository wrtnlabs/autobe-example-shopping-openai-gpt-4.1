import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { customer, orderId, body } = props;

  // 1. Find order and verify ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId, deleted_at: null },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.shopping_mall_customer_id !== customer.id)
    throw new HttpException("Forbidden: Not your order", 403);

  // Pagination defaults
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, any> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { refund_status: body.status }),
    ...(body.sku_code !== undefined &&
      body.sku_code !== null && { sku_code: body.sku_code }),
    ...(body.product_name !== undefined &&
      body.product_name !== null && {
        item_name: { contains: body.product_name },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { item_name: { contains: body.search } },
          { sku_code: { contains: body.search } },
        ],
      }),
  };

  // Sort
  let orderBy;
  if (body.sort && typeof body.sort === "string") {
    if (
      /^(created_at|item_name|sku_code|updated_at|refund_status)( asc| desc)?$/i.test(
        body.sort,
      )
    ) {
      const [field, direction] = body.sort.split(" ");
      orderBy = [
        {
          [field]: (direction && direction.toLowerCase() === "asc"
            ? "asc"
            : "desc") satisfies "asc" | "desc" as "asc" | "desc",
        },
      ];
    } else {
      orderBy = [
        { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" },
      ];
    }
  } else {
    orderBy = [
      { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_sku_id: true,
        item_name: true,
        sku_code: true,
        quantity: true,
        unit_price: true,
        currency: true,
        item_total: true,
        refund_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where,
    }),
  ]);

  const data = rows.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    item_name: item.item_name,
    sku_code: item.sku_code,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency: item.currency,
    item_total: item.item_total,
    refund_status: item.refund_status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
    },
    data,
  };
}
