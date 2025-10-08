import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerAppeals(props: {
  customer: CustomerPayload;
  body: IShoppingMallAppeal.ICreate;
}): Promise<IShoppingMallAppeal> {
  // Ensure escalation exists, is active, and is owned by this customer
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      id: props.body.escalation_id,
      deleted_at: null,
      initiator_customer_id: props.customer.id,
    },
  });
  if (!escalation) {
    throw new HttpException(
      "Cannot appeal: Escalation not found or not owned by customer",
      404,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_appeals.create({
    data: {
      id: v4(),
      escalation_id: props.body.escalation_id,
      appellant_customer_id: props.customer.id,
      appellant_seller_id: null,
      reviewing_admin_id: null,
      appeal_type: props.body.appeal_type,
      appeal_status: "pending",
      resolution_type: null,
      resolution_comment: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    escalation_id: created.escalation_id,
    appellant_customer_id: created.appellant_customer_id ?? null,
    appellant_seller_id: created.appellant_seller_id ?? null,
    reviewing_admin_id: created.reviewing_admin_id ?? null,
    appeal_type: created.appeal_type,
    appeal_status: created.appeal_status,
    resolution_type: created.resolution_type ?? null,
    resolution_comment: created.resolution_comment ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
