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

export async function putShoppingMallAdminCouponCampaignsCampaignId(props: {
  admin: AdminPayload;
  campaignId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponCampaign.IUpdate;
}): Promise<IShoppingMallCouponCampaign> {
  const { campaignId, body } = props;
  // 1. Ensure campaign exists and is not deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst({
      where: { id: campaignId, deleted_at: null },
    });
  if (!existing) {
    throw new HttpException("Coupon campaign not found", 404);
  }
  // 2. Name conflict check (exclude self)
  const conflict =
    await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst({
      where: {
        name: body.name,
        id: { not: campaignId },
        deleted_at: null,
      },
    });
  if (conflict) {
    throw new HttpException("Campaign name already in use", 409);
  }
  // 3. starts_at/ends_at window validation
  if (
    body.starts_at !== undefined &&
    body.starts_at !== null &&
    body.ends_at !== undefined &&
    body.ends_at !== null &&
    body.starts_at > body.ends_at
  ) {
    throw new HttpException("starts_at must not be after ends_at", 400);
  }
  // 4. Update operation
  const updated = await MyGlobal.prisma.shopping_mall_coupon_campaigns.update({
    where: { id: campaignId },
    data: {
      name: body.name,
      description: body.description ?? null,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      business_status: body.business_status,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    starts_at: updated.starts_at
      ? toISOStringSafe(updated.starts_at)
      : undefined,
    ends_at: updated.ends_at ? toISOStringSafe(updated.ends_at) : undefined,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
