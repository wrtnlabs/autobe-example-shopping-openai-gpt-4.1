import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerEscalations(props: {
  customer: CustomerPayload;
  body: IShoppingMallEscalation.ICreate;
}): Promise<IShoppingMallEscalation> {
  const now = toISOStringSafe(new Date());
  const { customer, body } = props;

  // 1. Validate that the order exists, is owned by the customer, and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: body.shopping_mall_order_id,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order does not exist or is not owned by the customer.",
      404,
    );
  }

  // 2. Prevent duplicate open escalation for the same order and type
  const existing = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      shopping_mall_order_id: body.shopping_mall_order_id,
      escalation_type: body.escalation_type,
      deleted_at: null,
      escalation_status: {
        in: ["pending", "in-review", "escalated-to-admin"],
      },
    },
  });
  if (existing) {
    throw new HttpException(
      "Duplicate unresolved escalation for this order and type.",
      409,
    );
  }

  // 3. Create escalation (init fields, no native Date or as)
  const created = await MyGlobal.prisma.shopping_mall_escalations.create({
    data: {
      id: v4(),
      shopping_mall_order_id: body.shopping_mall_order_id,
      initiator_customer_id: customer.id,
      initiator_seller_id: null,
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
    initiator_customer_id: created.initiator_customer_id ?? null,
    initiator_seller_id: created.initiator_seller_id ?? null,
    assigned_admin_id: created.assigned_admin_id ?? null,
    escalation_type: created.escalation_type,
    escalation_status: created.escalation_status,
    resolution_type: created.resolution_type ?? null,
    resolution_comment: created.resolution_comment ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
