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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;

  // Validate limit bounds
  const clampedLimit = Math.max(1, Math.min(limit, 100));
  // Validate shipment exists & authorization: shipment must be for THIS seller, given orderId.
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException(
      "You do not have access to this shipment/order.",
      403,
    );
  }

  // Build base where clause for shipment items
  let orderItemId: string | undefined = undefined;
  let orderItemProductId: string | undefined = undefined;
  if (props.body.order_item_id !== undefined) {
    orderItemId = props.body.order_item_id;
  }
  if (props.body.product_id !== undefined) {
    orderItemProductId = props.body.product_id;
  }

  // Get order items if filtering by product_id
  let orderItemIdsByProduct: string[] | undefined = undefined;
  if (orderItemProductId) {
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_order_id: props.orderId,
          shopping_mall_seller_id: props.seller.id,
          shopping_mall_product_id: orderItemProductId,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    orderItemIdsByProduct = orderItems.map((o) => o.id);
    if (orderItemIdsByProduct.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(clampedLimit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Shipment item filtering
  const shipmentItemsWhere: Record<string, any> = {
    shopping_mall_shipment_id: props.shipmentId,
    ...(orderItemId !== undefined && {
      shopping_mall_order_item_id: orderItemId,
    }),
    ...(orderItemIdsByProduct !== undefined && {
      shopping_mall_order_item_id: { in: orderItemIdsByProduct },
    }),
    // There is no status field to filter on in schema.
    deleted_at: null,
  };

  // Total count
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: shipmentItemsWhere,
  });

  // Get shipment items paginated
  const shipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: shipmentItemsWhere,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * clampedLimit,
      take: clampedLimit,
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(clampedLimit),
      records: total,
      pages: clampedLimit > 0 ? Math.ceil(total / clampedLimit) : 0,
    },
    data: shipmentItems.map((item) => ({
      id: item.id,
      shopping_mall_shipment_id: item.shopping_mall_shipment_id,
      shopping_mall_order_item_id: item.shopping_mall_order_item_id,
      shipped_quantity: item.shipped_quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
