import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import { IPageIShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponCampaign";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCouponCampaigns(props: {
  admin: AdminPayload;
  body: IShoppingMallCouponCampaign.IRequest;
}): Promise<IPageIShoppingMallCouponCampaign.ISummary> {
  const {
    name,
    business_status,
    starts_at_from,
    starts_at_to,
    ends_at_from,
    ends_at_to,
    page,
    limit,
  } = props.body;
  // Defaults
  const pageNum = page ?? 1;
  const pageSize = limit ?? 20;
  const skip = (pageNum - 1) * pageSize;

  // Where clause construction
  const where = {
    deleted_at: null,
    ...(name !== undefined &&
      name !== null && {
        name: { contains: name },
      }),
    ...(business_status !== undefined &&
      business_status !== null && {
        business_status,
      }),
    ...(starts_at_from !== undefined || starts_at_to !== undefined
      ? {
          starts_at: {
            ...(starts_at_from !== undefined && { gte: starts_at_from }),
            ...(starts_at_to !== undefined && { lte: starts_at_to }),
          },
        }
      : {}),
    ...(ends_at_from !== undefined || ends_at_to !== undefined
      ? {
          ends_at: {
            ...(ends_at_from !== undefined && { gte: ends_at_from }),
            ...(ends_at_to !== undefined && { lte: ends_at_to }),
          },
        }
      : {}),
  };

  // Fetch data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupon_campaigns.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.shopping_mall_coupon_campaigns.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    starts_at: row.starts_at ? toISOStringSafe(row.starts_at) : undefined,
    ends_at: row.ends_at ? toISOStringSafe(row.ends_at) : undefined,
    business_status: row.business_status,
  }));

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
