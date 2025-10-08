import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdCancellations(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation> {
  // Authorization: Seller can only view cancellations for their own order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId, deleted_at: null },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized: You do not own this order", 403);
  }

  // Build filters from request body
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.reason_code !== undefined &&
      props.body.reason_code !== null && {
        reason_code: props.body.reason_code,
      }),
    ...(props.body.explanation !== undefined &&
      props.body.explanation !== null && {
        explanation: props.body.explanation,
      }),
  };

  const [cancellations, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({ where }),
  ]);

  const data = cancellations.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    initiator_customer_id: row.initiator_customer_id ?? undefined,
    initiator_seller_id: row.initiator_seller_id ?? undefined,
    initiator_admin_id: row.initiator_admin_id ?? undefined,
    reason_code: row.reason_code,
    status: row.status,
    explanation: row.explanation ?? undefined,
    requested_at: toISOStringSafe(row.requested_at),
    resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // No page/limit in request type, so return all, 1 page.
  const pageLength = data.length;
  return {
    pagination: {
      current: 1,
      limit: pageLength,
      records: count,
      pages: 1,
    },
    data,
  };
}
