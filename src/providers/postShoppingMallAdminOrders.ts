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
import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const now = toISOStringSafe(new Date());
  const order_id = v4();

  // Validate referenced foreign keys before proceeding
  const [customer, channel, section, cart] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { id: props.body.shopping_mall_customer_id, deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_channels.findFirst({
      where: { id: props.body.shopping_mall_channel_id, deleted_at: null },
    }),
    MyGlobal.prisma.shopping_mall_sections.findFirst({
      where: { id: props.body.shopping_mall_section_id, deleted_at: null },
    }),
    props.body.shopping_mall_cart_id != null
      ? MyGlobal.prisma.shopping_mall_carts.findFirst({
          where: { id: props.body.shopping_mall_cart_id, deleted_at: null },
        })
      : Promise.resolve(null),
  ]);
  if (!customer) throw new HttpException("Customer not found", 404);
  if (!channel) throw new HttpException("Channel not found", 404);
  if (!section) throw new HttpException("Section not found", 404);
  if (props.body.shopping_mall_cart_id && !cart)
    throw new HttpException("Cart not found", 404);

  // Prepare nested creates
  const order_items = (props.body.order_items ?? []).map((item) => ({
    id: v4(),
    shopping_mall_order_id: order_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: item.shopping_mall_seller_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    final_price: item.final_price,
    discount_snapshot: item.discount_snapshot ?? undefined,
    status: item.status,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  }));
  const deliveries = (props.body.deliveries ?? []).map((d) => ({
    id: v4(),
    shopping_mall_order_id: order_id,
    shopping_mall_shipment_id: d.shopping_mall_shipment_id ?? undefined,
    recipient_name: d.recipient_name,
    recipient_phone: d.recipient_phone,
    address_snapshot: d.address_snapshot ?? "",
    delivery_message: d.delivery_message ?? undefined,
    delivery_status: d.delivery_status,
    confirmed_at: undefined,
    delivery_attempts: d.delivery_attempts,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  }));
  const payments = (props.body.payments ?? []).map((p) => ({
    id: v4(),
    shopping_mall_order_id: order_id,
    shopping_mall_customer_id: p.shopping_mall_customer_id,
    payment_type: p.payment_type,
    external_payment_ref: p.external_payment_ref ?? undefined,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    requested_at: p.requested_at,
    confirmed_at: undefined,
    cancelled_at: undefined,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  }));
  const after_sale_services = (props.body.after_sale_services ?? []).map(
    (a) => ({
      id: v4(),
      shopping_mall_order_id: order_id,
      shopping_mall_delivery_id: a.shopping_mall_delivery_id ?? undefined,
      case_type: a.case_type,
      status: "requested",
      reason: a.reason ?? undefined,
      evidence_snapshot: a.evidence_snapshot ?? undefined,
      resolution_message: a.resolution_message ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    }),
  );

  // Transactional create of all entities
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_orders.create({
      data: {
        id: order_id,
        shopping_mall_customer_id: props.body.shopping_mall_customer_id,
        shopping_mall_channel_id: props.body.shopping_mall_channel_id,
        shopping_mall_section_id: props.body.shopping_mall_section_id,
        shopping_mall_cart_id: props.body.shopping_mall_cart_id ?? undefined,
        external_order_ref: props.body.external_order_ref ?? undefined,
        status: "applied",
        order_type: props.body.order_type,
        total_amount: props.body.total_amount,
        paid_amount: null,
        currency: props.body.currency,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });
    if (order_items.length > 0)
      await tx.shopping_mall_order_items.createMany({ data: order_items });
    if (deliveries.length > 0)
      await tx.shopping_mall_deliveries.createMany({ data: deliveries });
    if (payments.length > 0)
      await tx.shopping_mall_payments.createMany({ data: payments });
    if (after_sale_services.length > 0)
      await tx.shopping_mall_after_sale_services.createMany({
        data: after_sale_services,
      });
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: order_id },
    });
    const resp_items = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: order_id },
    });
    const resp_deliveries = await tx.shopping_mall_deliveries.findMany({
      where: { shopping_mall_order_id: order_id },
    });
    const resp_payments = await tx.shopping_mall_payments.findMany({
      where: { shopping_mall_order_id: order_id },
    });
    const resp_after_sale = await tx.shopping_mall_after_sale_services.findMany(
      { where: { shopping_mall_order_id: order_id } },
    );
    return {
      order,
      resp_items,
      resp_deliveries,
      resp_payments,
      resp_after_sale,
    };
  });

  return {
    id: result.order.id,
    shopping_mall_customer_id: result.order.shopping_mall_customer_id,
    shopping_mall_channel_id: result.order.shopping_mall_channel_id,
    shopping_mall_section_id: result.order.shopping_mall_section_id,
    shopping_mall_cart_id: result.order.shopping_mall_cart_id ?? null,
    external_order_ref: result.order.external_order_ref ?? null,
    status: result.order.status,
    order_type: result.order.order_type,
    total_amount: result.order.total_amount,
    paid_amount: result.order.paid_amount ?? null,
    currency: result.order.currency,
    created_at: toISOStringSafe(result.order.created_at),
    updated_at: toISOStringSafe(result.order.updated_at),
    deleted_at: result.order.deleted_at
      ? toISOStringSafe(result.order.deleted_at)
      : null,
    order_items: result.resp_items.map((i) => ({
      id: i.id,
      shopping_mall_order_id: i.shopping_mall_order_id,
      shopping_mall_product_id: i.shopping_mall_product_id,
      shopping_mall_product_variant_id:
        i.shopping_mall_product_variant_id ?? undefined,
      shopping_mall_seller_id: i.shopping_mall_seller_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      final_price: i.final_price,
      discount_snapshot: i.discount_snapshot ?? undefined,
      status: i.status,
      created_at: toISOStringSafe(i.created_at),
      updated_at: toISOStringSafe(i.updated_at),
      deleted_at: i.deleted_at ? toISOStringSafe(i.deleted_at) : null,
    })),
    deliveries: result.resp_deliveries.map((d) => ({
      id: d.id,
      shopping_mall_order_id: d.shopping_mall_order_id,
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
      deleted_at: d.deleted_at ? toISOStringSafe(d.deleted_at) : null,
    })),
    payments: result.resp_payments.map((p) => ({
      id: p.id,
      shopping_mall_order_id: p.shopping_mall_order_id,
      shopping_mall_customer_id: p.shopping_mall_customer_id,
      payment_type: p.payment_type,
      external_payment_ref: p.external_payment_ref ?? undefined,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      requested_at: toISOStringSafe(p.requested_at),
      confirmed_at: p.confirmed_at ? toISOStringSafe(p.confirmed_at) : null,
      cancelled_at: p.cancelled_at ? toISOStringSafe(p.cancelled_at) : null,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
    })),
    after_sale_services: result.resp_after_sale.map((a) => ({
      id: a.id,
      shopping_mall_order_id: a.shopping_mall_order_id,
      shopping_mall_delivery_id: a.shopping_mall_delivery_id ?? null,
      case_type: a.case_type,
      status: a.status,
      reason: a.reason ?? null,
      evidence_snapshot: a.evidence_snapshot ?? null,
      resolution_message: a.resolution_message ?? null,
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : null,
    })),
  };
}
