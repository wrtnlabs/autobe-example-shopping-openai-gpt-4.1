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

export async function getShoppingMallAdminAdminActionLogsAdminActionLogId(props: {
  admin: AdminPayload;
  adminActionLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminActionLog> {
  const log = await MyGlobal.prisma.shopping_mall_admin_action_logs.findUnique({
    where: {
      id: props.adminActionLogId,
    },
  });
  if (!log) {
    throw new HttpException("Admin action log not found", 404);
  }
  return {
    id: log.id,
    shopping_mall_admin_id: log.shopping_mall_admin_id,
    affected_customer_id: log.affected_customer_id,
    affected_seller_id: log.affected_seller_id,
    affected_product_id: log.affected_product_id,
    affected_order_id: log.affected_order_id,
    affected_review_id: log.affected_review_id,
    action_type: log.action_type,
    action_reason: log.action_reason,
    domain: log.domain,
    details_json: log.details_json,
    created_at: toISOStringSafe(log.created_at),
  };
}
