import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCouponCampaignsCampaignId(props: {
  admin: AdminPayload;
  campaignId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCouponCampaign> {
  const campaign =
    await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst({
      where: {
        id: props.campaignId,
        deleted_at: null,
      },
    });
  if (!campaign) {
    throw new HttpException("Coupon campaign not found", 404);
  }
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description ?? null,
    starts_at: campaign.starts_at ? toISOStringSafe(campaign.starts_at) : null,
    ends_at: campaign.ends_at ? toISOStringSafe(campaign.ends_at) : null,
    business_status: campaign.business_status,
    created_at: toISOStringSafe(campaign.created_at),
    updated_at: toISOStringSafe(campaign.updated_at),
    deleted_at: campaign.deleted_at
      ? toISOStringSafe(campaign.deleted_at)
      : null,
  };
}
