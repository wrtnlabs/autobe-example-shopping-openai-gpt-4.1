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

export async function putShoppingMallAdminAnalyticsTriggersAnalyticsTriggerId(props: {
  admin: AdminPayload;
  analyticsTriggerId: string & tags.Format<"uuid">;
  body: IShoppingMallAnalyticsTrigger.IUpdate;
}): Promise<IShoppingMallAnalyticsTrigger> {
  const now = toISOStringSafe(new Date());

  // Only update fields provided in body
  const updateData = {
    ...(props.body.trigger_type !== undefined && {
      trigger_type: props.body.trigger_type,
    }),
    ...(props.body.schedule_config_json !== undefined && {
      schedule_config_json: props.body.schedule_config_json,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.outcome_log_json !== undefined && {
      outcome_log_json: props.body.outcome_log_json,
    }),
    ...(props.body.shopping_mall_admin_id !== undefined && {
      shopping_mall_admin_id: props.body.shopping_mall_admin_id,
    }),
    updated_at: now,
  };

  // Try update
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_analytics_triggers.update({
      where: { id: props.analyticsTriggerId },
      data: updateData,
    });
  } catch (err) {
    throw new HttpException("Analytics trigger not found", 404);
  }

  return {
    id: updated.id,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    trigger_type: updated.trigger_type,
    schedule_config_json: updated.schedule_config_json ?? undefined,
    status: updated.status,
    outcome_log_json: updated.outcome_log_json ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
