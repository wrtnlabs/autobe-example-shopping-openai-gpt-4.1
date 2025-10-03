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
}): Promise<IPageIShoppingMallOrderItem> {
  // Authorize access: ensure the order exists, is owned by the customer, and not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Paging/defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build filter
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.product_id !== undefined && {
      shopping_mall_product_id: props.body.product_id,
    }),
  };

  // Query and count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  // DTO conversion, dates as strings, null/undefined as per DTO
  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: item.shopping_mall_seller_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    final_price: item.final_price,
    discount_snapshot: item.discount_snapshot ?? undefined,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
