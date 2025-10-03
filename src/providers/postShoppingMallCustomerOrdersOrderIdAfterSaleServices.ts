import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdAfterSaleServices(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAfterSaleService.ICreate;
}): Promise<IShoppingMallAfterSaleService> {
  const { customer, orderId, body } = props;

  // 1. Validate order - must exist, belong to customer, be not deleted, and be active (eligible)
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
      shopping_mall_customer_id: customer.id,
      // Can check status eligibility (e.g. allow only paid/in_fulfillment/completed)
    },
  });
  if (!order)
    throw new HttpException(
      "Order not found or not eligible for after-sales service",
      404,
    );

  // 2. If delivery id is set, validate it belongs to the order
  if (
    body.shopping_mall_delivery_id !== undefined &&
    body.shopping_mall_delivery_id !== null
  ) {
    const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findFirst({
      where: {
        id: body.shopping_mall_delivery_id,
        shopping_mall_order_id: orderId,
        deleted_at: null,
      },
    });
    if (!delivery)
      throw new HttpException(
        "Referenced delivery is not valid for this order",
        400,
      );
  }

  // 3. Insert after-sales service record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_after_sale_services.create({
      data: {
        id: v4(),
        shopping_mall_order_id: orderId,
        shopping_mall_delivery_id: body.shopping_mall_delivery_id ?? undefined,
        case_type: body.case_type,
        status: "requested",
        reason: body.reason ?? undefined,
        evidence_snapshot: body.evidence_snapshot ?? undefined,
        resolution_message: body.resolution_message ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_delivery_id: created.shopping_mall_delivery_id ?? undefined,
    case_type: created.case_type,
    status: created.status,
    reason: created.reason ?? undefined,
    evidence_snapshot: created.evidence_snapshot ?? undefined,
    resolution_message: created.resolution_message ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
