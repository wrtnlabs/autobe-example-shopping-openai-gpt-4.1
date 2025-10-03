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

export async function postShoppingMallAdminCouponCampaigns(props: {
  admin: AdminPayload;
  body: IShoppingMallCouponCampaign.ICreate;
}): Promise<IShoppingMallCouponCampaign> {
  // Validate ends_at >= starts_at if both provided
  if (
    props.body.starts_at &&
    props.body.ends_at &&
    props.body.ends_at < props.body.starts_at
  ) {
    throw new HttpException(
      "ends_at must be greater than or equal to starts_at",
      400,
    );
  }
  // Enforce unique campaign name
  const exists = await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst(
    {
      where: { name: props.body.name },
    },
  );
  if (exists) {
    throw new HttpException(
      "A coupon campaign with this name already exists.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_coupon_campaigns.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      starts_at: props.body.starts_at ?? null,
      ends_at: props.body.ends_at ?? null,
      business_status: props.body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    name: created.name,
    description: created.description ?? undefined,
    starts_at: created.starts_at
      ? toISOStringSafe(created.starts_at)
      : undefined,
    ends_at: created.ends_at ? toISOStringSafe(created.ends_at) : undefined,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
