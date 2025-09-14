import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { IPageIAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCouponUse";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated coupon use events from ai_commerce_coupon_uses
 * for admin/seller analytics
 *
 * This operation retrieves a filtered, paginated list of coupon usage
 * (redemption) events from the ai_commerce_coupon_uses table for auditing,
 * analytics, and campaign tracking. Supports advanced filtering (user, coupon,
 * order, status, redemption period), full traceability, and pagination. Returns
 * each coupon use record with all pertinent identifiers and redemption
 * context.
 *
 * Only authenticated admins may call this endpoint. All result records include
 * soft-deleted/revoked uses for compliance. All results are sorted by most
 * recent redemption first.
 *
 * @param props - Request parameters
 * @param props.admin - The authenticated administrator making the request
 * @param props.body - Filter, sort, and pagination request body
 * @returns Paginated result of matching coupon use records, each with
 *   user/coupon/order context
 * @throws {Error} If any unexpected database or logic error is encountered
 */
export async function patchaiCommerceAdminCouponUses(props: {
  admin: AdminPayload;
  body: IAiCommerceCouponUse.IRequest;
}): Promise<IPageIAiCommerceCouponUse> {
  const { body } = props;

  // Enforce safe limit & page
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  let limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  if (limit > 500) limit = 500;
  const offset = (page - 1) * limit;

  // Build dynamic where clause
  const where: Record<string, unknown> = {
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && { redeemed_by: body.user_id }),
    ...(body.coupon_issue_id !== undefined &&
      body.coupon_issue_id !== null && {
        coupon_issue_id: body.coupon_issue_id,
      }),
    ...(body.order_id !== undefined &&
      body.order_id !== null && { order_id: body.order_id }),
    ...((body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
      ? {
          redeemed_at: {
            ...(body.from !== undefined &&
              body.from !== null && { gte: body.from }),
            ...(body.to !== undefined && body.to !== null && { lte: body.to }),
          },
        }
      : {}),
    // For admin API: include ALL records (including revoked/deleted); do not filter deleted_at
  };

  // Query database for paginated/filtered results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_coupon_uses.findMany({
      where,
      orderBy: { redeemed_at: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_coupon_uses.count({ where }),
  ]);

  // Transform DB rows to DTO format (date normalization, proper null/undefined)
  const data = rows.map((row) => {
    return {
      id: row.id,
      coupon_issue_id: row.coupon_issue_id,
      user_id: row.redeemed_by,
      status: row.status,
      redeemed_at: toISOStringSafe(row.redeemed_at),
      order_id: row.order_id === null ? null : row.order_id,
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
