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

export async function getShoppingMallCustomerAppealsAppealId(props: {
  customer: CustomerPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAppeal> {
  const { customer, appealId } = props;
  const appeal = await MyGlobal.prisma.shopping_mall_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
      appellant_customer_id: customer.id,
    },
  });
  if (!appeal) {
    throw new HttpException("Appeal not found", 404);
  }
  return {
    id: appeal.id,
    escalation_id: appeal.escalation_id,
    appellant_customer_id: appeal.appellant_customer_id ?? undefined,
    appellant_seller_id: appeal.appellant_seller_id ?? undefined,
    reviewing_admin_id: appeal.reviewing_admin_id ?? undefined,
    appeal_type: appeal.appeal_type,
    appeal_status: appeal.appeal_status,
    resolution_type: appeal.resolution_type ?? undefined,
    resolution_comment: appeal.resolution_comment ?? undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
  };
}
