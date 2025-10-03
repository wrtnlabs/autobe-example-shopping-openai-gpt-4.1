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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerCoupons(props: {
  seller: SellerPayload;
  body: IShoppingMallCoupon.IRequest;
}): Promise<IPageIShoppingMallCoupon.ISummary> {
  const { seller, body } = props;

  // Find seller's row
  const sellerRow = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      shopping_mall_customer_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerRow) throw new HttpException("Seller not found", 404);

  // Build where clause for filters
  const where = {
    deleted_at: null,
    shopping_mall_seller_id: sellerRow.id,
    ...(body.code !== undefined && { code: { contains: body.code } }),
    ...(body.title !== undefined && { title: { contains: body.title } }),
    ...(body.coupon_type !== undefined && { coupon_type: body.coupon_type }),
    ...(body.discount_type !== undefined && {
      discount_type: body.discount_type,
    }),
    ...(body.business_status !== undefined && {
      business_status: body.business_status,
    }),
    ...(body.stackable !== undefined && { stackable: body.stackable }),
    ...(body.exclusive !== undefined && { exclusive: body.exclusive }),
    ...(body.issued_at_from !== undefined || body.issued_at_to !== undefined
      ? {
          issued_at: {
            ...(body.issued_at_from !== undefined && {
              gte: body.issued_at_from,
            }),
            ...(body.issued_at_to !== undefined && { lte: body.issued_at_to }),
          },
        }
      : {}),
    ...(body.expires_at_from !== undefined || body.expires_at_to !== undefined
      ? {
          expires_at: {
            ...(body.expires_at_from !== undefined && {
              gte: body.expires_at_from,
            }),
            ...(body.expires_at_to !== undefined && {
              lte: body.expires_at_to,
            }),
          },
        }
      : {}),
    ...(body.usage_limit_total_min !== undefined ||
    body.usage_limit_total_max !== undefined
      ? {
          usage_limit_total: {
            ...(body.usage_limit_total_min !== undefined && {
              gte: body.usage_limit_total_min,
            }),
            ...(body.usage_limit_total_max !== undefined && {
              lte: body.usage_limit_total_max,
            }),
          },
        }
      : {}),
    ...(body.usage_limit_per_user_min !== undefined ||
    body.usage_limit_per_user_max !== undefined
      ? {
          usage_limit_per_user: {
            ...(body.usage_limit_per_user_min !== undefined && {
              gte: body.usage_limit_per_user_min,
            }),
            ...(body.usage_limit_per_user_max !== undefined && {
              lte: body.usage_limit_per_user_max,
            }),
          },
        }
      : {}),
    ...(body.issued_count_min !== undefined ||
    body.issued_count_max !== undefined
      ? {
          issued_count: {
            ...(body.issued_count_min !== undefined && {
              gte: body.issued_count_min,
            }),
            ...(body.issued_count_max !== undefined && {
              lte: body.issued_count_max,
            }),
          },
        }
      : {}),
    ...(body.used_count_min !== undefined || body.used_count_max !== undefined
      ? {
          used_count: {
            ...(body.used_count_min !== undefined && {
              gte: body.used_count_min,
            }),
            ...(body.used_count_max !== undefined && {
              lte: body.used_count_max,
            }),
          },
        }
      : {}),
  };

  // Sorting config
  const allowedSortFields: Record<string, true> = {
    issued_at: true,
    expires_at: true,
    issued_count: true,
    used_count: true,
    created_at: true,
  };
  const sortField =
    body.sort !== undefined && allowedSortFields[body.sort] === true
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Pagination
  const page = body.page !== undefined && body.page > 0 ? body.page : 1;
  const limit = body.limit !== undefined && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Query for results and total count in parallel
  const [coupons, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupons.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_coupons.count({ where }),
  ]);

  // Map DB rows to API ISummary
  const data = coupons.map((row) => {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      coupon_type: row.coupon_type,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      stackable: row.stackable,
      exclusive: row.exclusive,
      issued_at:
        row.issued_at !== null && row.issued_at !== undefined
          ? toISOStringSafe(row.issued_at)
          : null,
      expires_at:
        row.expires_at !== null && row.expires_at !== undefined
          ? toISOStringSafe(row.expires_at)
          : null,
      used_count: row.used_count,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
