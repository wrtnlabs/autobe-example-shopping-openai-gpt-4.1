import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { IPageIShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDelivery";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdDeliveries(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallDelivery.IRequest;
}): Promise<IPageIShoppingMallDelivery.ISummary> {
  // 1. Confirm order existence
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Find all order_items for this order where seller is responsible
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (items.length === 0) {
    return {
      pagination: {
        current: Number(props.body.page ?? 1),
        limit: Number(props.body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const itemIds: string[] = items.map((row) => row.id);
  const shipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: { shopping_mall_order_item_id: { in: itemIds } },
      select: { shopping_mall_shipment_id: true },
    });
  const allowedShipmentIds: string[] = shipmentItems.map(
    (row) => row.shopping_mall_shipment_id,
  );
  if (allowedShipmentIds.length === 0) {
    return {
      pagination: {
        current: Number(props.body.page ?? 1),
        limit: Number(props.body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;
  const allowedSort = [
    "created_at",
    "recipient_name",
    "delivery_status",
    "confirmed_at",
  ];
  const sort_by = allowedSort.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "created_at";
  const sort_order = props.body.sort_order === "asc" ? "asc" : "desc";
  const deliveryWhere: Record<string, any> = {
    shopping_mall_order_id: props.orderId,
    shopping_mall_shipment_id: { in: allowedShipmentIds },
    deleted_at: null,
  };
  if (props.body.delivery_status !== undefined) {
    deliveryWhere.delivery_status = props.body.delivery_status;
  }
  if (props.body.recipient_name !== undefined) {
    deliveryWhere.recipient_name = { contains: props.body.recipient_name };
  }
  if (props.body.recipient_phone !== undefined) {
    deliveryWhere.recipient_phone = { contains: props.body.recipient_phone };
  }
  if (props.body.shipment_id !== undefined) {
    deliveryWhere.shopping_mall_shipment_id = props.body.shipment_id;
  }
  if (
    props.body.confirmed_at_from !== undefined ||
    props.body.confirmed_at_to !== undefined
  ) {
    deliveryWhere.confirmed_at = {};
    if (props.body.confirmed_at_from !== undefined)
      deliveryWhere.confirmed_at.gte = props.body.confirmed_at_from;
    if (props.body.confirmed_at_to !== undefined)
      deliveryWhere.confirmed_at.lte = props.body.confirmed_at_to;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    deliveryWhere.created_at = {};
    if (props.body.created_at_from !== undefined)
      deliveryWhere.created_at.gte = props.body.created_at_from;
    if (props.body.created_at_to !== undefined)
      deliveryWhere.created_at.lte = props.body.created_at_to;
  }
  const [deliveries, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deliveries.findMany({
      where: deliveryWhere,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deliveries.count({ where: deliveryWhere }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: deliveries.map((delivery) => ({
      id: delivery.id,
      order_id: delivery.shopping_mall_order_id,
      shipment_id: delivery.shopping_mall_shipment_id ?? undefined,
      recipient_name: delivery.recipient_name,
      recipient_phone: delivery.recipient_phone,
      address_snapshot: delivery.address_snapshot,
      delivery_message: delivery.delivery_message ?? undefined,
      delivery_status: delivery.delivery_status,
      confirmed_at: delivery.confirmed_at
        ? toISOStringSafe(delivery.confirmed_at)
        : undefined,
      delivery_attempts: delivery.delivery_attempts,
      created_at: toISOStringSafe(delivery.created_at),
      updated_at: toISOStringSafe(delivery.updated_at),
      deleted_at: delivery.deleted_at
        ? toISOStringSafe(delivery.deleted_at)
        : undefined,
    })),
  };
}
