import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponIssuance";
import { IPageIShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponIssuance";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCouponsCouponIdIssuances(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponIssuance.IRequest;
}): Promise<IPageIShoppingMallCouponIssuance> {
  // 1. Coupon existence check
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: { id: props.couponId, deleted_at: null },
  });
  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }

  // 2. Prepare filtering
  const {
    shopping_mall_customer_id,
    status,
    code,
    issued_at_from,
    issued_at_to,
    expires_at_from,
    expires_at_to,
    page = 1,
    limit = 20,
    sort,
  } = props.body || {};
  const filters: Record<string, any> = {
    shopping_mall_coupon_id: props.couponId,
    deleted_at: null,
  };
  if (shopping_mall_customer_id !== undefined) {
    filters.shopping_mall_customer_id = shopping_mall_customer_id;
  }
  if (status !== undefined) {
    filters.status = status;
  }
  if (code !== undefined) {
    filters.code = { contains: code };
  }
  if (issued_at_from !== undefined || issued_at_to !== undefined) {
    filters.issued_at = {
      ...(issued_at_from !== undefined && { gte: issued_at_from }),
      ...(issued_at_to !== undefined && { lte: issued_at_to }),
    };
  }
  if (expires_at_from !== undefined || expires_at_to !== undefined) {
    filters.expires_at = {
      ...(expires_at_from !== undefined && { gte: expires_at_from }),
      ...(expires_at_to !== undefined && { lte: expires_at_to }),
    };
  }

  // 3. Pagination
  const take = limit;
  const skip = (page - 1) * take;

  // 4. Sort
  const allowedSortFields = [
    "created_at",
    "issued_at",
    "expires_at",
    "status",
    "code",
    "updated_at",
    "used_count",
  ];
  let orderBy: any = { created_at: "desc" };
  if (typeof sort === "string") {
    const [field, dir] = sort.trim().split(/\s+/);
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: dir === "asc" ? "asc" : "desc" };
    }
  }

  // 5. Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coupon_issuances.findMany({
      where: filters,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_coupon_issuances.count({
      where: filters,
    }),
  ]);

  // 6. Build results
  const result: IPageIShoppingMallCouponIssuance = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / Math.max(1, Number(limit))) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_coupon_id: row.shopping_mall_coupon_id,
      shopping_mall_customer_id: row.shopping_mall_customer_id ?? null,
      code: row.code,
      issued_at: toISOStringSafe(row.issued_at),
      expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : null,
      usage_limit: row.usage_limit ?? null,
      used_count: row.used_count,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
  return result;
}
