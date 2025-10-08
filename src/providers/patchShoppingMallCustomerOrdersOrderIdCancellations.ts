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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdCancellations(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IRequest;
}): Promise<IPageIShoppingMallOrderCancellation> {
  const { customer, orderId, body } = props;

  // Verify ownership: order must belong to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized to access this order's cancellations",
      403,
    );
  }

  // Pagination defaults (no params in request)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Prepare filter
  const where = {
    shopping_mall_order_id: orderId,
    ...(body.reason_code && { reason_code: body.reason_code }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_cancellations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_cancellations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_order_id: row.shopping_mall_order_id,
      initiator_customer_id: row.initiator_customer_id ?? undefined,
      initiator_seller_id: row.initiator_seller_id ?? undefined,
      initiator_admin_id: row.initiator_admin_id ?? undefined,
      reason_code: row.reason_code,
      status: row.status,
      explanation: row.explanation ?? undefined,
      requested_at: toISOStringSafe(row.requested_at),
      resolved_at: row.resolved_at
        ? toISOStringSafe(row.resolved_at)
        : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
