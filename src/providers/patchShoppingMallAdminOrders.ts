import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder> {
  const {
    status,
    order_type,
    created_from,
    created_to,
    page = 1,
    limit = 20,
  } = props.body ?? {};

  // where clause
  const where = {
    deleted_at: null,
    ...(status !== undefined && { status }),
    ...(order_type !== undefined && { order_type }),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined && { gte: created_from }),
            ...(created_to !== undefined && { lte: created_to }),
          },
        }
      : {}),
  };

  // pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // get orders and total
  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  const order_ids = orders.map((order) => order.id);

  // relations
  const [order_items, payments, shipments, deliveries, after_sale_services] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: { shopping_mall_order_id: { in: order_ids } },
      }),
      MyGlobal.prisma.shopping_mall_payments.findMany({
        where: { shopping_mall_order_id: { in: order_ids } },
      }),
      MyGlobal.prisma.shopping_mall_shipments.findMany({
        where: { shopping_mall_order_id: { in: order_ids } },
      }),
      MyGlobal.prisma.shopping_mall_deliveries.findMany({
        where: { shopping_mall_order_id: { in: order_ids } },
      }),
      MyGlobal.prisma.shopping_mall_after_sale_services.findMany({
        where: { shopping_mall_order_id: { in: order_ids } },
      }),
    ]);

  // map id to relation arrays
  const mapByOrderId = <T extends { shopping_mall_order_id: string }>(
    rows: T[],
  ) => {
    const m: Record<string, T[]> = {};
    for (const row of rows) {
      if (!m[row.shopping_mall_order_id]) m[row.shopping_mall_order_id] = [];
      m[row.shopping_mall_order_id].push(row);
    }
    return m;
  };
  const by_items = mapByOrderId(order_items);
  const by_payments = mapByOrderId(payments);
  const by_shipments = mapByOrderId(shipments);
  const by_deliveries = mapByOrderId(deliveries);
  const by_services = mapByOrderId(after_sale_services);

  // results
  const data = orders.map((order) => ({
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
    order_items: (by_items[order.id] ?? []).map((item) => ({
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
    payments: (by_payments[order.id] ?? []).map((payment) => ({
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
    shipments: (by_shipments[order.id] ?? []).map((shipment) => ({
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
    deliveries: (by_deliveries[order.id] ?? []).map((delivery) => ({
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
    after_sale_services: (by_services[order.id] ?? []).map((svc) => ({
      id: svc.id,
      shopping_mall_order_id: svc.shopping_mall_order_id,
      shopping_mall_delivery_id: svc.shopping_mall_delivery_id ?? undefined,
      case_type: svc.case_type,
      status: svc.status,
      reason: svc.reason ?? undefined,
      evidence_snapshot: svc.evidence_snapshot ?? undefined,
      resolution_message: svc.resolution_message ?? undefined,
      created_at: toISOStringSafe(svc.created_at),
      updated_at: toISOStringSafe(svc.updated_at),
      deleted_at: svc.deleted_at ? toISOStringSafe(svc.deleted_at) : undefined,
    })),
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
