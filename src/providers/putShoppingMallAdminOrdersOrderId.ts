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

export async function putShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  // 1. Fetch order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.deleted_at !== null && order.deleted_at !== undefined) {
    throw new HttpException("Cannot update a deleted order", 400);
  }

  // 2. Business constraint: finalized/cancelled
  const FINALIZED_STATUSES = ["completed", "cancelled"];
  if (FINALIZED_STATUSES.indexOf(order.status) !== -1) {
    throw new HttpException(
      "Cannot update a finalized or cancelled order",
      400,
    );
  }

  // 3. Validate status transition (no regression)
  if (props.body.status !== undefined && props.body.status !== order.status) {
    const validTransitions = ["applied", "paid", "shipping", "completed"];
    const currentIdx = validTransitions.indexOf(order.status);
    const nextIdx = validTransitions.indexOf(props.body.status);
    // Only allow forward transitions in the valid set
    if (currentIdx === -1 || nextIdx === -1 || nextIdx < currentIdx) {
      throw new HttpException("Illegal status transition", 400);
    }
  }

  // 4. Pre-update snapshot
  await MyGlobal.prisma.shopping_mall_order_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      snapshot_data: JSON.stringify(order),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Update allowed fields
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      ...(props.body.order_type !== undefined
        ? { order_type: props.body.order_type }
        : {}),
      ...(props.body.paid_amount !== undefined
        ? { paid_amount: props.body.paid_amount }
        : {}),
      ...(props.body.currency !== undefined
        ? { currency: props.body.currency }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 6. Fetch all related entities
  const [order_items, payments, shipments, deliveries, after_sale_services] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: { shopping_mall_order_id: updated.id },
      }),
      MyGlobal.prisma.shopping_mall_payments.findMany({
        where: { shopping_mall_order_id: updated.id },
      }),
      MyGlobal.prisma.shopping_mall_shipments.findMany({
        where: { shopping_mall_order_id: updated.id },
      }),
      MyGlobal.prisma.shopping_mall_deliveries.findMany({
        where: { shopping_mall_order_id: updated.id },
      }),
      MyGlobal.prisma.shopping_mall_after_sale_services.findMany({
        where: { shopping_mall_order_id: updated.id },
      }),
    ]);

  // 7. Format output
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_section_id: updated.shopping_mall_section_id,
    shopping_mall_cart_id:
      updated.shopping_mall_cart_id === null
        ? null
        : updated.shopping_mall_cart_id,
    external_order_ref:
      updated.external_order_ref === null ? null : updated.external_order_ref,
    status: updated.status,
    order_type: updated.order_type,
    total_amount: updated.total_amount,
    paid_amount: updated.paid_amount === null ? null : updated.paid_amount,
    currency: updated.currency,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
    order_items: order_items.map((item) => ({
      id: item.id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      shopping_mall_product_id: item.shopping_mall_product_id,
      shopping_mall_product_variant_id:
        item.shopping_mall_product_variant_id === null
          ? null
          : item.shopping_mall_product_variant_id,
      shopping_mall_seller_id: item.shopping_mall_seller_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      final_price: item.final_price,
      discount_snapshot:
        item.discount_snapshot === null ? null : item.discount_snapshot,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
    payments: payments.map((pay) => ({
      id: pay.id,
      shopping_mall_order_id: pay.shopping_mall_order_id,
      shopping_mall_customer_id: pay.shopping_mall_customer_id,
      payment_type: pay.payment_type,
      external_payment_ref:
        pay.external_payment_ref === null
          ? undefined
          : pay.external_payment_ref,
      status: pay.status,
      amount: pay.amount,
      currency: pay.currency,
      requested_at: toISOStringSafe(pay.requested_at),
      confirmed_at:
        pay.confirmed_at === null
          ? undefined
          : toISOStringSafe(pay.confirmed_at),
      cancelled_at:
        pay.cancelled_at === null
          ? undefined
          : toISOStringSafe(pay.cancelled_at),
      created_at: toISOStringSafe(pay.created_at),
      updated_at: toISOStringSafe(pay.updated_at),
      deleted_at:
        pay.deleted_at === null ? undefined : toISOStringSafe(pay.deleted_at),
    })),
    shipments: shipments.map((ship) => ({
      id: ship.id,
      shopping_mall_order_id: ship.shopping_mall_order_id,
      shopping_mall_seller_id: ship.shopping_mall_seller_id,
      shipment_code: ship.shipment_code,
      external_tracking_number:
        ship.external_tracking_number === null
          ? undefined
          : (ship.external_tracking_number satisfies string as string),
      status: ship.status,
      carrier: ship.carrier === null ? undefined : ship.carrier,
      requested_at:
        ship.requested_at === null
          ? undefined
          : toISOStringSafe(ship.requested_at),
      shipped_at:
        ship.shipped_at === null ? undefined : toISOStringSafe(ship.shipped_at),
      delivered_at:
        ship.delivered_at === null
          ? undefined
          : toISOStringSafe(ship.delivered_at),
      created_at: toISOStringSafe(ship.created_at),
      updated_at: toISOStringSafe(ship.updated_at),
      deleted_at:
        ship.deleted_at === null ? undefined : toISOStringSafe(ship.deleted_at),
    })),
    deliveries: deliveries.map((deliv) => ({
      id: deliv.id,
      shopping_mall_order_id: deliv.shopping_mall_order_id,
      shopping_mall_shipment_id:
        deliv.shopping_mall_shipment_id === null
          ? undefined
          : (deliv.shopping_mall_shipment_id satisfies string as string),
      recipient_name: deliv.recipient_name,
      recipient_phone: deliv.recipient_phone,
      address_snapshot: deliv.address_snapshot,
      delivery_message:
        deliv.delivery_message === null ? undefined : deliv.delivery_message,
      delivery_status: deliv.delivery_status,
      confirmed_at:
        deliv.confirmed_at === null
          ? undefined
          : toISOStringSafe(deliv.confirmed_at),
      delivery_attempts: deliv.delivery_attempts,
      created_at: toISOStringSafe(deliv.created_at),
      updated_at: toISOStringSafe(deliv.updated_at),
      deleted_at:
        deliv.deleted_at === null
          ? undefined
          : toISOStringSafe(deliv.deleted_at),
    })),
    after_sale_services: after_sale_services.map((asvc) => ({
      id: asvc.id,
      shopping_mall_order_id: asvc.shopping_mall_order_id,
      shopping_mall_delivery_id:
        asvc.shopping_mall_delivery_id === null
          ? undefined
          : (asvc.shopping_mall_delivery_id satisfies string as string),
      case_type: asvc.case_type,
      status: asvc.status,
      reason: asvc.reason === null ? undefined : asvc.reason,
      evidence_snapshot:
        asvc.evidence_snapshot === null ? undefined : asvc.evidence_snapshot,
      resolution_message:
        asvc.resolution_message === null ? undefined : asvc.resolution_message,
      created_at: toISOStringSafe(asvc.created_at),
      updated_at: toISOStringSafe(asvc.updated_at),
      deleted_at:
        asvc.deleted_at === null ? undefined : toISOStringSafe(asvc.deleted_at),
    })),
  };
}
