import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  // 1. Fetch the original order, error if not found
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Admins can always update permissible fields. Filter out any values not in Prisma schema.
  // Update eligible fields: status, business_status, shipping_address_id, payment_method_id
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: props.body.status ?? undefined,
      business_status: props.body.business_status ?? undefined,
      shipping_address_id: props.body.shipping_address_id ?? undefined,
      payment_method_id: props.body.payment_method_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Write to admin action logs for auditing
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      affected_order_id: updated.id,
      action_type: "order_update",
      action_reason: "Admin updated order via API",
      domain: "order",
      details_json: JSON.stringify({
        status: props.body.status ?? undefined,
        business_status: props.body.business_status ?? undefined,
        shipping_address_id: props.body.shipping_address_id ?? undefined,
        payment_method_id: props.body.payment_method_id ?? undefined,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Return mapped order, handling nullables and date strings
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? null,
    shipping_address_id: updated.shipping_address_id,
    payment_method_id: updated.payment_method_id,
    order_number: updated.order_number,
    status: updated.status,
    business_status: updated.business_status ?? null,
    order_total: updated.order_total,
    currency: updated.currency,
    placed_at: toISOStringSafe(updated.placed_at),
    paid_at: updated.paid_at ? toISOStringSafe(updated.paid_at) : null,
    fulfilled_at: updated.fulfilled_at
      ? toISOStringSafe(updated.fulfilled_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
