import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdSnapshots(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderSnapshot> {
  // 1. Verify that seller is authorized for orderId
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_channel_id: true,
      shopping_mall_section_id: true,
    },
  });
  if (!order) throw new HttpException("Order not found", 404);
  // Find at least one order item for this order with this seller
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (orderItemCount === 0)
    throw new HttpException(
      "Forbidden: Seller does not manage this order",
      403,
    );

  // 2. Handle pagination
  const page =
    typeof props.body.page === "number" && props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" &&
    props.body.limit > 0 &&
    props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  // 3. Build filter
  const where: Record<string, any> = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.order_snapshot_id !== undefined && {
      id: props.body.order_snapshot_id,
    }),
    ...(props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_start && {
              gte: props.body.created_at_start,
            }),
            ...(props.body.created_at_end && {
              lte: props.body.created_at_end,
            }),
          },
        }
      : {}),
  };

  // 4. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_snapshots.count({ where }),
  ]);

  // Map result
  const data = rows.map((s) => ({
    id: s.id,
    shopping_mall_order_id: s.shopping_mall_order_id,
    snapshot_data: s.snapshot_data,
    created_at: toISOStringSafe(s.created_at),
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
