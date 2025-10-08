import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerEscalations(props: {
  seller: SellerPayload;
  body: IShoppingMallEscalation.ICreate;
}): Promise<IShoppingMallEscalation> {
  const { seller, body } = props;
  // 1. Find the order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: body.shopping_mall_order_id },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("You can only escalate for your own orders", 403);
  }
  // 2. Check duplicate unresolved escalation for same order and type
  const duplicate = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      shopping_mall_order_id: body.shopping_mall_order_id,
      escalation_type: body.escalation_type,
      deleted_at: null,
      OR: [
        { escalation_status: "pending" },
        { escalation_status: "in-review" },
        { escalation_status: "escalated-to-admin" },
      ],
    },
  });
  if (duplicate) {
    throw new HttpException(
      "A similar unresolved escalation already exists for this order and type",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_escalations.create({
    data: {
      id: v4(),
      shopping_mall_order_id: body.shopping_mall_order_id,
      initiator_seller_id: seller.id,
      initiator_customer_id: null,
      assigned_admin_id: null,
      escalation_type: body.escalation_type,
      escalation_status: body.escalation_status ?? "pending",
      resolution_type: body.resolution_type ?? null,
      resolution_comment: body.resolution_comment ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    initiator_seller_id: created.initiator_seller_id,
    initiator_customer_id: created.initiator_customer_id,
    assigned_admin_id: created.assigned_admin_id,
    escalation_type: created.escalation_type,
    escalation_status: created.escalation_status,
    resolution_type: created.resolution_type ?? null,
    resolution_comment: created.resolution_comment ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
