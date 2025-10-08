import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAnalyticsTriggersAnalyticsTriggerId(props: {
  admin: AdminPayload;
  analyticsTriggerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAnalyticsTrigger> {
  const trigger =
    await MyGlobal.prisma.shopping_mall_analytics_triggers.findFirst({
      where: {
        id: props.analyticsTriggerId,
        deleted_at: null,
      },
    });
  if (!trigger) {
    throw new HttpException("Analytics Trigger not found", 404);
  }
  return {
    id: trigger.id,
    shopping_mall_admin_id: trigger.shopping_mall_admin_id ?? undefined,
    trigger_type: trigger.trigger_type,
    schedule_config_json: trigger.schedule_config_json ?? undefined,
    status: trigger.status,
    outcome_log_json: trigger.outcome_log_json ?? undefined,
    created_at: toISOStringSafe(trigger.created_at),
    updated_at: toISOStringSafe(trigger.updated_at),
    deleted_at: trigger.deleted_at ? toISOStringSafe(trigger.deleted_at) : null,
  };
}
