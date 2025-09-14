import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import { IPageIAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list platform coupons with filtering and pagination (admin only)
 * from ai_commerce_coupons.
 *
 * This endpoint returns paginated coupon summary records with rich filtering by
 * code, type, validity, status, or issuer. Only authorized admin users can
 * access analytics and business strategy data for coupons. Attempts by
 * non-admins are denied.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user issuing the query
 *   (authorization enforced)
 * @param props.body - Filter, sort, and pagination criteria for coupon search
 * @returns Paginated list of coupon summary records matching filters and
 *   ordering
 * @throws {Error} If authorization is missing or database query fails
 */
export async function patchaiCommerceAdminCoupons(props: {
  admin: AdminPayload;
  body: IAiCommerceCoupon.IRequest;
}): Promise<IPageIAiCommerceCoupon.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "valid_from",
    "valid_until",
    "coupon_code",
    "status",
    "type",
  ];
  const sortField =
    body.sortBy && allowedSortFields.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(body.coupon_code !== undefined &&
      body.coupon_code !== null &&
      body.coupon_code !== "" && {
        coupon_code: { contains: body.coupon_code },
      }),
    ...(body.status !== undefined &&
      body.status !== null &&
      body.status !== "" && {
        status: body.status,
      }),
    ...(body.type !== undefined &&
      body.type !== null &&
      body.type !== "" && {
        type: body.type,
      }),
    ...(body.issuedBy !== undefined &&
      body.issuedBy !== null &&
      body.issuedBy !== "" && {
        issued_by: body.issuedBy,
      }),
    ...((body.validFrom !== undefined && body.validFrom !== null) ||
    (body.validUntil !== undefined && body.validUntil !== null)
      ? {
          AND: [
            ...(body.validFrom !== undefined && body.validFrom !== null
              ? [
                  {
                    valid_from: { gte: body.validFrom },
                  },
                ]
              : []),
            ...(body.validUntil !== undefined && body.validUntil !== null
              ? [
                  {
                    valid_until: { lte: body.validUntil },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_coupons.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        coupon_code: true,
        type: true,
        valid_from: true,
        valid_until: true,
        issued_by: true,
        max_uses: true,
        conditions: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_coupons.count({ where }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      coupon_code: r.coupon_code,
      type: r.type,
      valid_from: toISOStringSafe(r.valid_from),
      valid_until: toISOStringSafe(r.valid_until),
      issued_by: r.issued_by === null ? undefined : r.issued_by,
      max_uses: r.max_uses === null ? undefined : r.max_uses,
      conditions: r.conditions === null ? undefined : r.conditions,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at:
        r.deleted_at === null ? undefined : toISOStringSafe(r.deleted_at),
    })),
  };
}
