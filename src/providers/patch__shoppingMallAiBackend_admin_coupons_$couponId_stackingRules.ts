import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";
import { IPageIShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponStackingRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated searchable list of coupon stacking rules for business/campaign ops.
 *
 * Search, filter, and audit all stacking rules for a given coupon, providing
 * business operator or admin with the full policy details for which codes can
 * or cannot be stacked together. Each result includes exclusion policy,
 * rationale, and linkage to policy/campaign assignment. The results are
 * paginated for scalability and support large-scale campaign policy
 * review/audit workflows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the query
 * @param props.couponId - Coupon ID (UUID) for which stacking rules are to be
 *   queried
 * @param props.body - Filter/search and pagination parameters for stacking
 *   rules
 * @returns Pagination metadata and matching stacking rules array (including
 *   full audit fields)
 * @throws {Error} When the given coupon ID is invalid or not accessible by
 *   admin
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_stackingRules(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponStackingRule.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponStackingRule> {
  const { admin, couponId, body } = props;

  // Enforce admin authorization: prior decorator/provider ensures admin is active and enrolled

  // Paging defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build Prisma query filters inlined for type safety (couponId always required)
  const where = {
    shopping_mall_ai_backend_coupon_id: couponId,
    ...(body.type !== undefined && { type: body.type }),
    ...(body.appliesToType !== undefined && {
      applies_to_type: body.appliesToType,
    }),
    ...(body.excludedCouponId !== undefined && {
      excluded_coupon_id: body.excludedCouponId,
    }),
  };

  // Query paginated stacking rules, and count for total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shopping_mall_ai_backend_coupon_id: true,
        excluded_coupon_id: true,
        type: true,
        applies_to_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.count({
      where,
    }),
  ]);

  // Format data: convert dates, ensure ids and optional fields are handled
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id,
      shopping_mall_ai_backend_coupon_id:
        r.shopping_mall_ai_backend_coupon_id ?? null,
      excluded_coupon_id: r.excluded_coupon_id ?? null,
      type: r.type,
      applies_to_type: r.applies_to_type ?? null,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
