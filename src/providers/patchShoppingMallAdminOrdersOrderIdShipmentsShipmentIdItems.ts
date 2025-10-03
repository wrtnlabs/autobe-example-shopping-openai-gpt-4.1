import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem> {
  // Validate that the shipment exists and belongs to the given order
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
    },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found for given order", 404);
  }

  const limit = props.body.limit !== undefined ? props.body.limit : 20;
  const page = props.body.page !== undefined ? props.body.page : 1;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_mall_shipment_id: props.shipmentId,
    ...(props.body.order_item_id !== undefined && {
      shopping_mall_order_item_id: props.body.order_item_id,
    }),
  };

  // If filtering by product_id, join with order items to get matching order_item_ids
  let orderItemIdFilter: string[] | undefined;
  if (props.body.product_id !== undefined) {
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_order_id: props.orderId,
          shopping_mall_product_id: props.body.product_id,
        },
        select: { id: true },
      },
    );
    orderItemIdFilter = orderItems.map((o) => o.id);
    if (orderItemIdFilter.length === 0) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.shopping_mall_order_item_id = { in: orderItemIdFilter };
  }

  const [shipmentItems, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shipment_items.count({ where }),
  ]);

  const data = shipmentItems.map((item) => ({
    id: item.id,
    shopping_mall_shipment_id: item.shopping_mall_shipment_id,
    shopping_mall_order_item_id: item.shopping_mall_order_item_id,
    shipped_quantity: item.shipped_quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data,
  };
}
