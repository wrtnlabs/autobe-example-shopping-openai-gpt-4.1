import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const {
    code,
    coupon_type,
    discount_type,
    business_status,
    title,
    issued_at_from,
    issued_at_to,
    expires_at_from,
    expires_at_to,
    stackable,
    exclusive,
    usage_limit_total_min,
    usage_limit_total_max,
    usage_limit_per_user_min,
    usage_limit_per_user_max,
    issued_count_min,
    issued_count_max,
    used_count_min,
    used_count_max,
    sort,
    order,
    page,
    limit,
  } = props.body;

  const allowedSortFields = [
    "issued_at",
    "expires_at",
    "used_count",
    "created_at",
  ];
  const sortField =
    sort && allowedSortFields.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const safePage = typeof page === "number" && page > 0 ? page : 1;
  const safeLimit =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  const where = {
    deleted_at: null,
    ...(code ? { code: { contains: code } } : {}),
    ...(coupon_type ? { coupon_type } : {}),
    ...(discount_type ? { discount_type } : {}),
    ...(business_status ? { business_status } : {}),
    ...(title ? { title: { contains: title } } : {}),
    ...(typeof stackable === "boolean" ? { stackable } : {}),
    ...(typeof exclusive === "boolean" ? { exclusive } : {}),
    ...(issued_at_from || issued_at_to
      ? {
          issued_at: {
            ...(issued_at_from ? { gte: issued_at_from } : {}),
            ...(issued_at_to ? { lte: issued_at_to } : {}),
          },
        }
      : {}),
    ...(expires_at_from || expires_at_to
      ? {
          expires_at: {
            ...(expires_at_from ? { gte: expires_at_from } : {}),
            ...(expires_at_to ? { lte: expires_at_to } : {}),
          },
        }
      : {}),
    ...(usage_limit_total_min !== undefined ||
    usage_limit_total_max !== undefined
      ? {
          usage_limit_total: {
            ...(usage_limit_total_min !== undefined
              ? { gte: usage_limit_total_min }
              : {}),
            ...(usage_limit_total_max !== undefined
              ? { lte: usage_limit_total_max }
              : {}),
          },
        }
      : {}),
    ...(usage_limit_per_user_min !== undefined ||
    usage_limit_per_user_max !== undefined
      ? {
          usage_limit_per_user: {
            ...(usage_limit_per_user_min !== undefined
              ? { gte: usage_limit_per_user_min }
              : {}),
            ...(usage_limit_per_user_max !== undefined
              ? { lte: usage_limit_per_user_max }
              : {}),
          },
        }
      : {}),
    ...(issued_count_min !== undefined || issued_count_max !== undefined
      ? {
          issued_count: {
            ...(issued_count_min !== undefined
              ? { gte: issued_count_min }
              : {}),
            ...(issued_count_max !== undefined
              ? { lte: issued_count_max }
              : {}),
          },
        }
      : {}),
    ...(used_count_min !== undefined || used_count_max !== undefined
      ? {
          used_count: {
            ...(used_count_min !== undefined ? { gte: used_count_min } : {}),
            ...(used_count_max !== undefined ? { lte: used_count_max } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: safeLimit,
      select: {
        id: true,
        code: true,
        title: true,
        coupon_type: true,
        discount_type: true,
        discount_value: true,
        stackable: true,
        exclusive: true,
        issued_at: true,
        expires_at: true,
        used_count: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    coupon_type: row.coupon_type,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    stackable: row.stackable,
    exclusive: row.exclusive,
    issued_at: row.issued_at ? toISOStringSafe(row.issued_at) : undefined,
    expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : undefined,
    used_count: row.used_count,
  }));

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
