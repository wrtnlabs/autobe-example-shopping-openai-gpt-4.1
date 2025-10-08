import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrderHistoriesOrderHistoryId(props: {
  seller: SellerPayload;
  orderHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderHistory> {
  const { seller, orderHistoryId } = props;

  // 1. Fetch order history and include order's shopping_mall_seller_id for authorization
  const history =
    await MyGlobal.prisma.shopping_mall_order_histories.findUnique({
      where: { id: orderHistoryId, deleted_at: null },
      include: {
        order: {
          select: { shopping_mall_seller_id: true },
        },
      },
    });
  if (!history) {
    throw new HttpException("Order history not found", 404);
  }
  // 2. Authorization: Only seller of this order can view
  if (!history.order || history.order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You cannot view this order history",
      403,
    );
  }

  return {
    id: history.id,
    shopping_mall_order_id: history.shopping_mall_order_id,
    snapshot_type: history.snapshot_type,
    order_status: history.order_status,
    order_total: history.order_total,
    snapshot_reason: history.snapshot_reason ?? undefined,
    created_at: toISOStringSafe(history.created_at),
    deleted_at: history.deleted_at
      ? toISOStringSafe(history.deleted_at)
      : undefined,
  };
}
