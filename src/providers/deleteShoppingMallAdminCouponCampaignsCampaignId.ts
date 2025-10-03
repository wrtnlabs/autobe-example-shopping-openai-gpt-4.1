import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponCampaignsCampaignId(props: {
  admin: AdminPayload;
  campaignId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, campaignId } = props;
  // Step 1: Find campaign to ensure it exists and not already deleted
  const campaign =
    await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst({
      where: {
        id: campaignId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!campaign) {
    throw new HttpException(
      "Coupon campaign not found or already deleted",
      404,
    );
  }
  // Step 2: Soft delete - mark deleted_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_coupon_campaigns.update({
    where: { id: campaignId },
    data: { deleted_at: now },
  });
  // Step 3: Audit log
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "coupon_campaign",
      entity_id: campaignId,
      event_type: "soft_delete",
      actor_id: admin.id,
      event_result: "success",
      event_message: null,
      event_time: now,
      created_at: now,
    },
  });
}
