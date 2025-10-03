import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });
  if (!order)
    throw new HttpException("Order not found or already deleted", 404);

  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: props.orderId },
  });
  const sellerOwnsItem = orderItems.some(
    (item) => item.shopping_mall_seller_id === props.seller.id,
  );
  if (!sellerOwnsItem) {
    throw new HttpException("You are not authorized to update this order", 403);
  }
  const finalizedStatuses = ["delivered", "completed", "cancelled"];
  if (finalizedStatuses.includes(order.status)) {
    throw new HttpException(
      "Cannot update a finalized or cancelled order",
      400,
    );
  }
  if (props.body.status !== undefined) {
    const allowedTransitions: Record<string, string[]> = {
      applied: ["payment_required", "cancelled"],
      payment_required: ["paid", "cancelled"],
      paid: ["in_fulfillment", "cancelled"],
      in_fulfillment: ["shipping", "cancelled"],
      shipping: ["delivered", "cancelled"],
      delivered: ["completed"],
      completed: [],
      cancelled: [],
    };
    const current = order.status;
    const next = props.body.status;
    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  await MyGlobal.prisma.shopping_mall_order_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      snapshot_data: JSON.stringify(order),
      created_at: toISOStringSafe(new Date()),
    },
  });
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: {
      status: props.body.status ?? undefined,
      order_type: props.body.order_type ?? undefined,
      paid_amount: props.body.paid_amount ?? undefined,
      currency: props.body.currency ?? undefined,
      updated_at: now,
    },
  });

  const [payments, shipments, deliveries, afterSaleServices] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_payments.findMany({
        where: { shopping_mall_order_id: order.id },
      }),
      MyGlobal.prisma.shopping_mall_shipments.findMany({
        where: { shopping_mall_order_id: order.id },
      }),
      MyGlobal.prisma.shopping_mall_deliveries.findMany({
        where: { shopping_mall_order_id: order.id },
      }),
      MyGlobal.prisma.shopping_mall_after_sale_services.findMany({
        where: { shopping_mall_order_id: order.id },
      }),
    ]);

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_customer_id: updated.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    shopping_mall_channel_id: updated.shopping_mall_channel_id as string &
      tags.Format<"uuid">,
    shopping_mall_section_id: updated.shopping_mall_section_id as string &
      tags.Format<"uuid">,
    shopping_mall_cart_id: updated.shopping_mall_cart_id ?? null,
    external_order_ref: updated.external_order_ref ?? null,
    status: updated.status,
    order_type: updated.order_type,
    total_amount: updated.total_amount,
    paid_amount: updated.paid_amount ?? null,
    currency: updated.currency,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    order_items: orderItems.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: item.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_product_id: item.shopping_mall_product_id as string &
        tags.Format<"uuid">,
      shopping_mall_product_variant_id:
        item.shopping_mall_product_variant_id ?? null,
      shopping_mall_seller_id: item.shopping_mall_seller_id as string &
        tags.Format<"uuid">,
      quantity: item.quantity,
      unit_price: item.unit_price,
      final_price: item.final_price,
      discount_snapshot: item.discount_snapshot ?? null,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at
        ? toISOStringSafe(item.deleted_at)
        : undefined,
    })),
    payments: payments.map((p) => ({
      id: p.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: p.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_customer_id: p.shopping_mall_customer_id as string &
        tags.Format<"uuid">,
      payment_type: p.payment_type,
      external_payment_ref: p.external_payment_ref ?? null,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      requested_at: toISOStringSafe(p.requested_at),
      confirmed_at: p.confirmed_at
        ? toISOStringSafe(p.confirmed_at)
        : undefined,
      cancelled_at: p.cancelled_at
        ? toISOStringSafe(p.cancelled_at)
        : undefined,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : undefined,
    })),
    shipments: shipments.map((s) => ({
      id: s.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: s.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_seller_id: s.shopping_mall_seller_id as string &
        tags.Format<"uuid">,
      shipment_code: s.shipment_code,
      external_tracking_number: s.external_tracking_number ?? undefined,
      status: s.status,
      carrier: s.carrier ?? undefined,
      requested_at: s.requested_at
        ? toISOStringSafe(s.requested_at)
        : undefined,
      shipped_at: s.shipped_at ? toISOStringSafe(s.shipped_at) : undefined,
      delivered_at: s.delivered_at
        ? toISOStringSafe(s.delivered_at)
        : undefined,
      created_at: toISOStringSafe(s.created_at),
      updated_at: toISOStringSafe(s.updated_at),
      deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : undefined,
    })),
    deliveries: deliveries.map((d) => ({
      id: d.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: d.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_shipment_id: d.shopping_mall_shipment_id ?? undefined,
      recipient_name: d.recipient_name,
      recipient_phone: d.recipient_phone,
      address_snapshot: d.address_snapshot,
      delivery_message: d.delivery_message ?? undefined,
      delivery_status: d.delivery_status,
      confirmed_at: d.confirmed_at
        ? toISOStringSafe(d.confirmed_at)
        : undefined,
      delivery_attempts: d.delivery_attempts,
      created_at: toISOStringSafe(d.created_at),
      updated_at: toISOStringSafe(d.updated_at),
      deleted_at: d.deleted_at ? toISOStringSafe(d.deleted_at) : undefined,
    })),
    after_sale_services: afterSaleServices.map((a) => ({
      id: a.id as string & tags.Format<"uuid">,
      shopping_mall_order_id: a.shopping_mall_order_id as string &
        tags.Format<"uuid">,
      shopping_mall_delivery_id: a.shopping_mall_delivery_id ?? null,
      case_type: a.case_type,
      status: a.status,
      reason: a.reason ?? null,
      evidence_snapshot: a.evidence_snapshot ?? null,
      resolution_message: a.resolution_message ?? null,
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : undefined,
    })),
  };
}
