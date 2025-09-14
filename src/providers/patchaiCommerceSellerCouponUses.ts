import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { IPageIAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCouponUse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve paginated coupon use events from ai_commerce_coupon_uses
 * for admin/seller analytics.
 *
 * This function returns a filtered and paginated list of coupon usage
 * (redemption) records for coupons owned by the seller. Each result includes
 * coupon usage details, with filters for user, coupon issue, order, status, and
 * redemption date.
 *
 * Only coupons issued by the authenticated seller are visible. Deleted/revoked
 * uses are only visible to privileged users (not seller).
 *
 * @param props - The request object
 * @param props.seller - Authenticated seller's payload (must be seller role)
 * @param props.body - Filter and paging options (see
 *   IAiCommerceCouponUse.IRequest)
 * @returns A paginated result with filtered coupon usage events
 */
export async function patchaiCommerceSellerCouponUses(props: {
  seller: SellerPayload;
  body: IAiCommerceCouponUse.IRequest;
}): Promise<IPageIAiCommerceCouponUse> {
  const { seller, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Step 1: get coupon IDs issued by this seller
  const coupons = await MyGlobal.prisma.ai_commerce_coupons.findMany({
    where: {
      issued_by: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (coupons.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const couponIds = coupons.map((c) => c.id);

  // Step 2: get coupon issue IDs for these coupons
  const issues = await MyGlobal.prisma.ai_commerce_coupon_issues.findMany({
    where: {
      coupon_id: { in: couponIds },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (issues.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const issueIds = issues.map((i) => i.id);

  // Step 3: build filters for coupon uses
  const where: Record<string, unknown> = {
    deleted_at: null,
    coupon_issue_id: { in: issueIds },
  };
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (body.user_id !== undefined && body.user_id !== null) {
    where.redeemed_by = body.user_id;
  }
  if (body.coupon_issue_id !== undefined && body.coupon_issue_id !== null) {
    where.coupon_issue_id = body.coupon_issue_id;
  }
  if (body.order_id !== undefined && body.order_id !== null) {
    where.order_id = body.order_id;
  }
  if (
    (body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
  ) {
    where.redeemed_at = {
      ...(body.from !== undefined && body.from !== null && { gte: body.from }),
      ...(body.to !== undefined && body.to !== null && { lte: body.to }),
    };
  }

  // Step 4: get paginated result and total count
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_coupon_uses.count({ where }),
    MyGlobal.prisma.ai_commerce_coupon_uses.findMany({
      where,
      orderBy: { redeemed_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
  ]);

  // Step 5: map rows to IAiCommerceCouponUse[]
  const data = rows.map((row) => ({
    id: row.id,
    coupon_issue_id: row.coupon_issue_id,
    user_id: row.redeemed_by,
    status: row.status,
    redeemed_at: toISOStringSafe(row.redeemed_at),
    order_id: row.order_id === null ? null : row.order_id,
  }));

  // Step 6: return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
