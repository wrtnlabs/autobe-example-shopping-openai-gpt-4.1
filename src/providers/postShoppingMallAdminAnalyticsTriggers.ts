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

export async function postShoppingMallAdminAnalyticsTriggers(props: {
  admin: AdminPayload;
  body: IShoppingMallAnalyticsTrigger.ICreate;
}): Promise<IShoppingMallAnalyticsTrigger> {
  // Validate schedule_config_json is valid JSON (stringified object or array)
  try {
    JSON.parse(props.body.schedule_config_json);
  } catch {
    throw new HttpException(
      "schedule_config_json must be valid JSON string",
      400,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const trigger = await MyGlobal.prisma.shopping_mall_analytics_triggers.create(
    {
      data: {
        id: v4(),
        shopping_mall_admin_id: props.admin.id,
        trigger_type: props.body.trigger_type,
        schedule_config_json: props.body.schedule_config_json,
        status: props.body.status,
        outcome_log_json: props.body.outcome_log_json ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    },
  );
  return {
    id: trigger.id,
    shopping_mall_admin_id: trigger.shopping_mall_admin_id ?? undefined,
    trigger_type: trigger.trigger_type,
    schedule_config_json: trigger.schedule_config_json ?? undefined,
    status: trigger.status,
    outcome_log_json: trigger.outcome_log_json ?? undefined,
    created_at: toISOStringSafe(trigger.created_at),
    updated_at: toISOStringSafe(trigger.updated_at),
    deleted_at: trigger.deleted_at
      ? toISOStringSafe(trigger.deleted_at)
      : undefined,
  };
}
