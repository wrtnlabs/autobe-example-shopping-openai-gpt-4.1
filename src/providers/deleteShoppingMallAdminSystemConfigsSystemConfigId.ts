import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1) Look up config; throw 404 if not found
  const config = await MyGlobal.prisma.shopping_mall_system_configs.findUnique({
    where: { id: props.systemConfigId },
  });
  if (!config || config.deleted_at !== null) {
    throw new HttpException("System configuration not found", 404);
  }

  // 2) Hardcoded protected configs (main bootstrap/configs) -- should ideally be list from business, for now, check conventional keys
  const protectedKeys = [
    "BOOTSTRAP_MODE", // Platform bootstrapping mode
    "API_SECRET_KEY", // API key
    "DATABASE_URL", // Database connection
    "CDN_ROOT_URI", // CDN root
    "CRITICAL_SUPPORT_EMAIL", // Platform support address
  ];
  if (protectedKeys.includes(config.config_key.toUpperCase())) {
    throw new HttpException(
      "Attempting to delete essential system config",
      403,
    );
  }

  // 3) Delete (hard delete from table)
  await MyGlobal.prisma.shopping_mall_system_configs.delete({
    where: { id: props.systemConfigId },
  });

  // 4) Audit log admin action to admin_action_logs
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      action_type: "system_config_delete",
      action_reason: `Deleted system config [${config.config_key}] by admin`,
      domain: "system_config",
      affected_customer_id: null,
      affected_seller_id: null,
      affected_product_id: null,
      affected_order_id: null,
      affected_review_id: null,
      details_json: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 5) Invalidate platform cache, post-deletion hooks (not shown)
  // This is system-dependent - assumes invalidation is async or handled elsewhere
}
