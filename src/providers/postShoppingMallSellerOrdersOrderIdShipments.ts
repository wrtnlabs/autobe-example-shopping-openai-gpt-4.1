import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // 1. Check that order exists and is eligible
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }
  if (order.status === "cancelled" || order.status === "completed") {
    throw new HttpException("Order is not eligible for shipment.", 400);
  }

  // 2. Seller must be assigned to at least one order item
  const sellerItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerItem) {
    throw new HttpException(
      "You are not authorized to register a shipment for this order.",
      403,
    );
  }

  // 3. Create shipment
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      shipment_code: props.body.shipment_code,
      external_tracking_number:
        props.body.external_tracking_number ?? undefined,
      status: props.body.status,
      carrier: props.body.carrier ?? undefined,
      requested_at: props.body.requested_at ?? undefined,
      shipped_at: undefined,
      delivered_at: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    shipment_code: created.shipment_code,
    external_tracking_number: created.external_tracking_number ?? undefined,
    status: created.status,
    carrier: created.carrier ?? undefined,
    requested_at: created.requested_at
      ? toISOStringSafe(created.requested_at)
      : undefined,
    shipped_at: created.shipped_at
      ? toISOStringSafe(created.shipped_at)
      : undefined,
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
