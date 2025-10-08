import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAdminActionLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminActionLog.ICreate;
}): Promise<IShoppingMallAdminActionLog> {
  const { admin, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      affected_customer_id: body.affected_customer_id ?? null,
      affected_seller_id: body.affected_seller_id ?? null,
      affected_product_id: body.affected_product_id ?? null,
      affected_order_id: body.affected_order_id ?? null,
      affected_review_id: body.affected_review_id ?? null,
      action_type: body.action_type,
      action_reason: body.action_reason,
      domain: body.domain,
      details_json: body.details_json ?? null,
      created_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_admin_id: created.shopping_mall_admin_id,
    affected_customer_id: created.affected_customer_id ?? null,
    affected_seller_id: created.affected_seller_id ?? null,
    affected_product_id: created.affected_product_id ?? null,
    affected_order_id: created.affected_order_id ?? null,
    affected_review_id: created.affected_review_id ?? null,
    action_type: created.action_type,
    action_reason: created.action_reason,
    domain: created.domain,
    details_json: created.details_json ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
