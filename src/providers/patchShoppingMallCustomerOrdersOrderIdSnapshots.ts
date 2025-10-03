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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderSnapshot> {
  const { customer, orderId, body } = props;

  // 1. Ownership check: does this order belong to the customer?
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // 2. Pagination params for page/limit
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // 3. Build date filter object for created_at
  let createdAtFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.created_at_start !== undefined && body.created_at_start !== null) {
    createdAtFilter.gte = body.created_at_start;
  }
  if (body.created_at_end !== undefined && body.created_at_end !== null) {
    createdAtFilter.lte = body.created_at_end;
  }

  // 4. Build where clause, always include orderId
  const where = {
    shopping_mall_order_id: orderId,
    ...(body.order_snapshot_id !== undefined && body.order_snapshot_id !== null
      ? { id: body.order_snapshot_id }
      : {}),
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
  };

  // 5. Fetch data and count
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_snapshots.count({ where }),
  ]);

  // 6. Map results to correct type
  const data = snapshots.map((snapshot) => ({
    id: snapshot.id,
    shopping_mall_order_id: snapshot.shopping_mall_order_id,
    snapshot_data: snapshot.snapshot_data,
    created_at: toISOStringSafe(snapshot.created_at),
  }));

  // 7. Pagination info
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(totalPages),
    },
    data,
  };
}
