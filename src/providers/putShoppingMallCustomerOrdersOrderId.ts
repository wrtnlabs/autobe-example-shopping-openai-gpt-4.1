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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Fetch the order (enforce customer ownership, soft delete check)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.deleted_at)
    throw new HttpException("Cannot update a deleted order", 400);
  if (order.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException(
      "Forbidden: You may only update your own orders",
      403,
    );

  // 2. Disallow update if order already finalized
  const finalized = [
    "completed",
    "cancelled",
    "delivered",
    "shipping",
    "in_fulfillment",
  ];
  if (finalized.includes(order.status))
    throw new HttpException(
      "Cannot update a finalized order (state: " + order.status + ")",
      400,
    );

  // 3. If attempting illegal status transitions, block
  if (
    props.body.status &&
    finalized.includes(props.body.status) &&
    !(order.status === "paid" && props.body.status === "in_fulfillment")
  ) {
    throw new HttpException(
      "Illegal order status transition to a finalized state",
      400,
    );
  }

  // 4. Insert pre-update snapshot for audit
  await MyGlobal.prisma.shopping_mall_entity_snapshots.create({
    data: {
      id: v4(),
      entity_type: "order",
      entity_id: order.id,
      snapshot_reason: "pre-update",
      snapshot_actor_id: props.customer.id,
      snapshot_data: JSON.stringify(order),
      event_time: now,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Perform update: only allow fields defined in IUpdate, update updated_at
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.status ? { status: props.body.status } : {}),
      ...(props.body.order_type ? { order_type: props.body.order_type } : {}),
      ...(props.body.paid_amount !== undefined
        ? { paid_amount: props.body.paid_amount }
        : {}),
      ...(props.body.currency ? { currency: props.body.currency } : {}),
      updated_at: now,
    },
  });

  // 6. Compose full return value (IShoppingMallOrder; fetch relations for items/payments/shipments/deliveries/aftersales)
  const full = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    include: {
      shopping_mall_order_items: true,
      shopping_mall_payments: true,
      shopping_mall_shipments: true,
      shopping_mall_deliveries: true,
      shopping_mall_after_sale_services: true,
    },
  });
  if (!full) throw new HttpException("Failed to reload updated order", 500);

  // Map DB record to IShoppingMallOrder compliance (dates, optionals)
  return {
    id: full.id,
    shopping_mall_customer_id: full.shopping_mall_customer_id,
    shopping_mall_channel_id: full.shopping_mall_channel_id,
    shopping_mall_section_id: full.shopping_mall_section_id,
    shopping_mall_cart_id:
      typeof full.shopping_mall_cart_id === "string"
        ? full.shopping_mall_cart_id
        : (full.shopping_mall_cart_id ?? undefined),
    external_order_ref:
      typeof full.external_order_ref === "string"
        ? full.external_order_ref
        : (full.external_order_ref ?? undefined),
    status: full.status,
    order_type: full.order_type,
    total_amount: full.total_amount,
    paid_amount: full.paid_amount ?? undefined,
    currency: full.currency,
    created_at: toISOStringSafe(full.created_at),
    updated_at: toISOStringSafe(full.updated_at),
    deleted_at: full.deleted_at ? toISOStringSafe(full.deleted_at) : undefined,
    order_items: Array.isArray(full.shopping_mall_order_items)
      ? full.shopping_mall_order_items.map((x) => ({
          id: x.id,
          shopping_mall_order_id: x.shopping_mall_order_id,
          shopping_mall_product_id: x.shopping_mall_product_id,
          shopping_mall_product_variant_id:
            typeof x.shopping_mall_product_variant_id === "string"
              ? x.shopping_mall_product_variant_id
              : (x.shopping_mall_product_variant_id ?? undefined),
          shopping_mall_seller_id: x.shopping_mall_seller_id,
          quantity: x.quantity,
          unit_price: x.unit_price,
          final_price: x.final_price,
          discount_snapshot:
            typeof x.discount_snapshot === "string"
              ? x.discount_snapshot
              : (x.discount_snapshot ?? undefined),
          status: x.status,
          created_at: toISOStringSafe(x.created_at),
          updated_at: toISOStringSafe(x.updated_at),
          deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
        }))
      : undefined,
    payments: Array.isArray(full.shopping_mall_payments)
      ? full.shopping_mall_payments.map((x) => ({
          id: x.id,
          shopping_mall_order_id: x.shopping_mall_order_id,
          shopping_mall_customer_id: x.shopping_mall_customer_id,
          payment_type: x.payment_type,
          external_payment_ref:
            typeof x.external_payment_ref === "string"
              ? x.external_payment_ref
              : (x.external_payment_ref ?? undefined),
          status: x.status,
          amount: x.amount,
          currency: x.currency,
          requested_at: toISOStringSafe(x.requested_at),
          confirmed_at: x.confirmed_at
            ? toISOStringSafe(x.confirmed_at)
            : undefined,
          cancelled_at: x.cancelled_at
            ? toISOStringSafe(x.cancelled_at)
            : undefined,
          created_at: toISOStringSafe(x.created_at),
          updated_at: toISOStringSafe(x.updated_at),
          deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
        }))
      : undefined,
    shipments: Array.isArray(full.shopping_mall_shipments)
      ? full.shopping_mall_shipments.map((x) => ({
          id: x.id,
          shopping_mall_order_id: x.shopping_mall_order_id,
          shopping_mall_seller_id: x.shopping_mall_seller_id,
          shipment_code: x.shipment_code,
          external_tracking_number:
            typeof x.external_tracking_number === "string"
              ? x.external_tracking_number
              : (x.external_tracking_number ?? undefined),
          status: x.status,
          carrier:
            typeof x.carrier === "string"
              ? x.carrier
              : (x.carrier ?? undefined),
          requested_at: x.requested_at
            ? toISOStringSafe(x.requested_at)
            : undefined,
          shipped_at: x.shipped_at ? toISOStringSafe(x.shipped_at) : undefined,
          delivered_at: x.delivered_at
            ? toISOStringSafe(x.delivered_at)
            : undefined,
          created_at: toISOStringSafe(x.created_at),
          updated_at: toISOStringSafe(x.updated_at),
          deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
        }))
      : undefined,
    deliveries: Array.isArray(full.shopping_mall_deliveries)
      ? full.shopping_mall_deliveries.map((x) => ({
          id: x.id,
          shopping_mall_order_id: x.shopping_mall_order_id,
          shopping_mall_shipment_id:
            typeof x.shopping_mall_shipment_id === "string"
              ? x.shopping_mall_shipment_id
              : (x.shopping_mall_shipment_id ?? undefined),
          recipient_name: x.recipient_name,
          recipient_phone: x.recipient_phone,
          address_snapshot: x.address_snapshot,
          delivery_message:
            typeof x.delivery_message === "string"
              ? x.delivery_message
              : (x.delivery_message ?? undefined),
          delivery_status: x.delivery_status,
          confirmed_at: x.confirmed_at
            ? toISOStringSafe(x.confirmed_at)
            : undefined,
          delivery_attempts: x.delivery_attempts,
          created_at: toISOStringSafe(x.created_at),
          updated_at: toISOStringSafe(x.updated_at),
          deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
        }))
      : undefined,
    after_sale_services: Array.isArray(full.shopping_mall_after_sale_services)
      ? full.shopping_mall_after_sale_services.map((x) => ({
          id: x.id,
          shopping_mall_order_id: x.shopping_mall_order_id,
          shopping_mall_delivery_id:
            typeof x.shopping_mall_delivery_id === "string"
              ? x.shopping_mall_delivery_id
              : (x.shopping_mall_delivery_id ?? undefined),
          case_type: x.case_type,
          status: x.status,
          reason:
            typeof x.reason === "string" ? x.reason : (x.reason ?? undefined),
          evidence_snapshot:
            typeof x.evidence_snapshot === "string"
              ? x.evidence_snapshot
              : (x.evidence_snapshot ?? undefined),
          resolution_message:
            typeof x.resolution_message === "string"
              ? x.resolution_message
              : (x.resolution_message ?? undefined),
          created_at: toISOStringSafe(x.created_at),
          updated_at: toISOStringSafe(x.updated_at),
          deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : undefined,
        }))
      : undefined,
  };
}
