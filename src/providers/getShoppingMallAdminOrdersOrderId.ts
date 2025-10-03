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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    include: {
      shopping_mall_order_items: true,
      shopping_mall_payments: true,
      shopping_mall_shipments: true,
      shopping_mall_deliveries: true,
      shopping_mall_after_sale_services: true,
    },
  });

  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_channel_id: order.shopping_mall_channel_id,
    shopping_mall_section_id: order.shopping_mall_section_id,
    shopping_mall_cart_id: order.shopping_mall_cart_id ?? undefined,
    external_order_ref: order.external_order_ref ?? undefined,
    status: order.status,
    order_type: order.order_type,
    total_amount: order.total_amount,
    paid_amount: order.paid_amount ?? undefined,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
    order_items: order.shopping_mall_order_items.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_product_id: item.shopping_mall_product_id,
      shopping_mall_product_variant_id:
        item.shopping_mall_product_variant_id ?? undefined,
      shopping_mall_seller_id: item.shopping_mall_seller_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      final_price: item.final_price,
      discount_snapshot: item.discount_snapshot ?? undefined,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at
        ? toISOStringSafe(item.deleted_at)
        : undefined,
    })),
    payments: order.shopping_mall_payments.map((payment) => ({
      id: payment.id,
      shopping_mall_order_id: payment.shopping_mall_order_id,
      shopping_mall_customer_id: payment.shopping_mall_customer_id,
      payment_type: payment.payment_type,
      external_payment_ref: payment.external_payment_ref ?? undefined,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      requested_at: toISOStringSafe(payment.requested_at),
      confirmed_at: payment.confirmed_at
        ? toISOStringSafe(payment.confirmed_at)
        : undefined,
      cancelled_at: payment.cancelled_at
        ? toISOStringSafe(payment.cancelled_at)
        : undefined,
      created_at: toISOStringSafe(payment.created_at),
      updated_at: toISOStringSafe(payment.updated_at),
      deleted_at: payment.deleted_at
        ? toISOStringSafe(payment.deleted_at)
        : undefined,
    })),
    shipments: order.shopping_mall_shipments.map((shipment) => ({
      id: shipment.id,
      shopping_mall_order_id: shipment.shopping_mall_order_id,
      shopping_mall_seller_id: shipment.shopping_mall_seller_id,
      shipment_code: shipment.shipment_code,
      external_tracking_number: shipment.external_tracking_number ?? undefined,
      status: shipment.status,
      carrier: shipment.carrier ?? undefined,
      requested_at: shipment.requested_at
        ? toISOStringSafe(shipment.requested_at)
        : undefined,
      shipped_at: shipment.shipped_at
        ? toISOStringSafe(shipment.shipped_at)
        : undefined,
      delivered_at: shipment.delivered_at
        ? toISOStringSafe(shipment.delivered_at)
        : undefined,
      created_at: toISOStringSafe(shipment.created_at),
      updated_at: toISOStringSafe(shipment.updated_at),
      deleted_at: shipment.deleted_at
        ? toISOStringSafe(shipment.deleted_at)
        : undefined,
    })),
    deliveries: order.shopping_mall_deliveries.map((delivery) => ({
      id: delivery.id,
      shopping_mall_order_id: delivery.shopping_mall_order_id,
      shopping_mall_shipment_id:
        delivery.shopping_mall_shipment_id ?? undefined,
      recipient_name: delivery.recipient_name,
      recipient_phone: delivery.recipient_phone,
      address_snapshot: delivery.address_snapshot,
      delivery_message: delivery.delivery_message ?? undefined,
      delivery_status: delivery.delivery_status,
      confirmed_at: delivery.confirmed_at
        ? toISOStringSafe(delivery.confirmed_at)
        : undefined,
      delivery_attempts: delivery.delivery_attempts,
      created_at: toISOStringSafe(delivery.created_at),
      updated_at: toISOStringSafe(delivery.updated_at),
      deleted_at: delivery.deleted_at
        ? toISOStringSafe(delivery.deleted_at)
        : undefined,
    })),
    after_sale_services: order.shopping_mall_after_sale_services.map(
      (service) => ({
        id: service.id,
        shopping_mall_order_id: service.shopping_mall_order_id,
        shopping_mall_delivery_id:
          service.shopping_mall_delivery_id ?? undefined,
        case_type: service.case_type,
        status: service.status,
        reason: service.reason ?? undefined,
        evidence_snapshot: service.evidence_snapshot ?? undefined,
        resolution_message: service.resolution_message ?? undefined,
        created_at: toISOStringSafe(service.created_at),
        updated_at: toISOStringSafe(service.updated_at),
        deleted_at: service.deleted_at
          ? toISOStringSafe(service.deleted_at)
          : undefined,
      }),
    ),
  };
}
