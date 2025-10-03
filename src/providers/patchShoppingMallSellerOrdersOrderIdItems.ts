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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: props.orderId,
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.product_id !== undefined && {
      shopping_mall_product_id: props.body.product_id,
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      row.shopping_mall_product_variant_id === null
        ? null
        : row.shopping_mall_product_variant_id === undefined
          ? undefined
          : row.shopping_mall_product_variant_id,
    shopping_mall_seller_id: row.shopping_mall_seller_id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    final_price: row.final_price,
    discount_snapshot:
      row.discount_snapshot === null
        ? null
        : row.discount_snapshot === undefined
          ? undefined
          : row.discount_snapshot,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null
        ? null
        : row.deleted_at === undefined
          ? undefined
          : toISOStringSafe(row.deleted_at),
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
