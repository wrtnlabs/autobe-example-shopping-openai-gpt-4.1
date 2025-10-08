import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAnalyticsTriggersAnalyticsTriggerId(props: {
  admin: AdminPayload;
  analyticsTriggerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check that analytics trigger exists
  const trigger =
    await MyGlobal.prisma.shopping_mall_analytics_triggers.findUnique({
      where: { id: props.analyticsTriggerId },
    });
  if (!trigger) {
    throw new HttpException("Analytics trigger not found", 404);
  }
  // 2. Hard delete the trigger
  await MyGlobal.prisma.shopping_mall_analytics_triggers.delete({
    where: { id: props.analyticsTriggerId },
  });
  // 3. Log admin action (in action logs, with erased trigger id in details_json)
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action_type: "erase",
      action_reason: "Erased analytics trigger permanently",
      domain: "analytics_trigger",
      details_json: JSON.stringify({
        analyticsTriggerId: props.analyticsTriggerId,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
