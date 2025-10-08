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
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const { seller, orderId, body } = props;
  // 1. Load order to validate ownership & existence
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.shopping_mall_seller_id !== seller.id)
    throw new HttpException(
      "Forbidden: You do not have access to this order's items",
      403,
    );

  // Pagination
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Filtering
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && {
        refund_status: body.status,
      }),
    ...(body.sku_code !== undefined &&
      body.sku_code !== null && {
        sku_code: { contains: body.sku_code },
      }),
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

  // Sorting
  const sortableFields = [
    "created_at",
    "item_name",
    "sku_code",
    "unit_price",
    "quantity",
  ];
  let orderBy: any = { created_at: "desc" };
  if (
    body.sort !== undefined &&
    body.sort !== null &&
    typeof body.sort === "string"
  ) {
    let field = body.sort;
    let direction: "asc" | "desc" = "desc";
    if (field.startsWith("-")) {
      field = field.slice(1);
      direction = "desc";
    } else if (field.startsWith("+")) {
      field = field.slice(1);
      direction = "asc";
    } else {
      direction = "asc";
    }
    if (sortableFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Query paginated items and total count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where,
    }),
  ]);

  const data = items.map((item) => ({
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
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
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
