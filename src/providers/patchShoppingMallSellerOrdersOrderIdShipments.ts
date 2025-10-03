import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const { seller, orderId, body } = props;

  // Pagination/defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Authorization check: seller must have an order item in this order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: orderId,
      shopping_mall_seller_id: seller.id,
    },
    select: { id: true },
  });
  if (!orderItem) {
    throw new HttpException(
      "Unauthorized: This order has no shipments for your seller account",
      403,
    );
  }

  // Dynamic where clause construction for shipment filtering
  const createdAtFilter =
    body.created_from !== undefined && body.created_from !== null
      ? body.created_to !== undefined && body.created_to !== null
        ? { gte: body.created_from, lte: body.created_to }
        : { gte: body.created_from }
      : body.created_to !== undefined && body.created_to !== null
        ? { lte: body.created_to }
        : undefined;

  const where = {
    shopping_mall_order_id: orderId,
    shopping_mall_seller_id: seller.id,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.shipment_code !== undefined && {
      shipment_code: body.shipment_code,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.shopping_mall_order_id,
    seller_id: row.shopping_mall_seller_id,
    shipment_code: row.shipment_code,
    external_tracking_number: row.external_tracking_number ?? undefined,
    status: row.status,
    carrier: row.carrier ?? undefined,
    requested_at: row.requested_at
      ? toISOStringSafe(row.requested_at)
      : undefined,
    shipped_at: row.shipped_at ? toISOStringSafe(row.shipped_at) : undefined,
    delivered_at: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
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
