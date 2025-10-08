import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSetting";
import { IPageIShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPlatformSettings(props: {
  admin: AdminPayload;
  body: IShoppingMallPlatformSetting.IRequest;
}): Promise<IPageIShoppingMallPlatformSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build main AND conditions
  const andConditions: any[] = [{ deleted_at: null }];
  // Site title filter (OR)
  if (props.body.site_title !== undefined && props.body.site_title !== null) {
    andConditions.push({
      OR: [
        { site_title_ko: { contains: props.body.site_title } },
        { site_title_en: { contains: props.body.site_title } },
      ],
    });
  }
  // Date range filter
  if (props.body.created_from !== undefined && props.body.created_from !== null)
    andConditions.push({ created_at: { gte: props.body.created_from } });
  if (props.body.created_to !== undefined && props.body.created_to !== null)
    andConditions.push({ created_at: { lte: props.body.created_to } });
  // Search filter (OR)
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
  ) {
    andConditions.push({
      OR: [
        { site_title_ko: { contains: props.body.search } },
        { site_title_en: { contains: props.body.search } },
        { site_description_ko: { contains: props.body.search } },
        { site_description_en: { contains: props.body.search } },
      ],
    });
  }
  const where =
    andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

  const orderField = props.body.order_by ?? "created_at";
  const orderDir = props.body.order_dir ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_platform_settings.findMany({
      where,
      orderBy: [{ [orderField]: orderDir }],
      skip: Number(skip),
      take: Number(limit),
      select: {
        id: true,
        site_title_ko: true,
        site_title_en: true,
        support_email: true,
        branding_logo_uri: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_platform_settings.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      site_title_ko: row.site_title_ko,
      site_title_en: row.site_title_en,
      support_email: row.support_email ?? null,
      branding_logo_uri: row.branding_logo_uri ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
