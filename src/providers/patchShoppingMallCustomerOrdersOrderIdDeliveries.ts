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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdDeliveries(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallDelivery.IRequest;
}): Promise<IPageIShoppingMallDelivery.ISummary> {
  const { customer, orderId, body } = props;

  // 1. Security: Validate order is owned by this customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Order not found or forbidden", 404);
  }

  // 2. Pagination defaults
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // 3. Filter construction
  const where: Record<string, any> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.delivery_status && { delivery_status: body.delivery_status }),
    ...(body.recipient_name && {
      recipient_name: { contains: body.recipient_name },
    }),
    ...(body.recipient_phone && {
      recipient_phone: { contains: body.recipient_phone },
    }),
    ...(body.shipment_id && { shopping_mall_shipment_id: body.shipment_id }),
    ...(body.confirmed_at_from || body.confirmed_at_to
      ? {
          confirmed_at: {
            ...(body.confirmed_at_from && { gte: body.confirmed_at_from }),
            ...(body.confirmed_at_to && { lte: body.confirmed_at_to }),
          },
        }
      : {}),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // 4. Sorting
  const allowedSort: Record<string, boolean> = {
    created_at: true,
    recipient_name: true,
    delivery_status: true,
    confirmed_at: true,
  };
  const sort_by =
    body.sort_by && allowedSort[body.sort_by] ? body.sort_by : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query deliveries and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deliveries.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deliveries.count({ where }),
  ]);

  // 6. Map to ISummary DTO, handling null/optional fields
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.shopping_mall_order_id,
    shipment_id: row.shopping_mall_shipment_id ?? undefined,
    recipient_name: row.recipient_name,
    recipient_phone: row.recipient_phone,
    address_snapshot: row.address_snapshot,
    delivery_message: row.delivery_message ?? undefined,
    delivery_status: row.delivery_status,
    confirmed_at: row.confirmed_at
      ? toISOStringSafe(row.confirmed_at)
      : undefined,
    delivery_attempts: row.delivery_attempts,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // 7. Pagination object with correct type normalization
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
