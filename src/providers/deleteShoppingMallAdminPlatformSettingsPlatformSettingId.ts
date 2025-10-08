import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPlatformSettingsPlatformSettingId(props: {
  admin: AdminPayload;
  platformSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the platform setting by ID, only if not already deleted
  const setting =
    await MyGlobal.prisma.shopping_mall_platform_settings.findFirst({
      where: {
        id: props.platformSettingId,
        deleted_at: null,
      },
    });
  if (!setting) {
    throw new HttpException("Platform setting not found", 404);
  }

  // Soft delete (update deleted_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_platform_settings.update({
    where: { id: props.platformSettingId },
    data: { deleted_at: now },
  });

  // Audit log entry
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      affected_customer_id: null,
      affected_seller_id: null,
      affected_product_id: null,
      affected_order_id: null,
      affected_review_id: null,
      action_type: "soft_delete",
      action_reason: "Platform setting deleted",
      domain: "system",
      details_json: JSON.stringify({ id: props.platformSettingId }),
      created_at: now,
    },
  });
  // Cache invalidation step removed because the function/property does not exist.
}
