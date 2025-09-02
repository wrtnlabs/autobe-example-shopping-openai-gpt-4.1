import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponCode";
import { IPageIShoppingMallAiBackendCouponCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponCode";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search on coupon codes for campaign or compliance analysis.
 *
 * Search and retrieve coupon codes for a specific coupon, including details,
 * status, audit, and campaign assignment. Enables business visibility for event
 * distribution, bulk code management, or identification of fraud. Filters by
 * code, status (issued, redeemed, available, revoked), and supports
 * evidence-grade traceability. Only available to roles with campaign/compliance
 * authority.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the search
 *   (authorization enforced)
 * @param props.couponId - Coupon ID (UUID) for which codes are being
 *   searched/audited
 * @param props.body - Search, filter, and pagination criteria
 * @returns Paginated list of coupon code details with full audit info
 * @throws {Error} When admin payload is missing or unauthorized
 * @throws {Error} When the coupon does not exist
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_codes(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponCode.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponCode> {
  const { admin, couponId, body } = props;
  // Authorization enforced by presence of admin argument (decorator validates account)

  // Determine pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Verify coupon existence (returning error for non-existent/invalid coupon)
  const couponExists =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: {
        id: couponId,
        deleted_at: null, // hard search for only active coupons
      },
      select: { id: true },
    });
  if (!couponExists)
    throw new Error("Coupon does not exist or is not accessible");

  // Compose Prisma filter for search
  // All parameters inlined for type safety and traceability
  const where = {
    shopping_mall_ai_backend_coupon_id: couponId,
    ...(body.code && {
      bulk_code: {
        contains: body.code,
        mode: "insensitive" as const, // PRISMA expects literal 'insensitive'
      },
    }),
    ...(body.status && { status: body.status }),
    ...(body.issuedToEmail && { issued_to_email: body.issuedToEmail }),
  };

  // Fetch paginated results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_codes.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_codes.count({ where }),
  ]);

  // Transform database results to strict DTOs
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_coupon_id:
        row.shopping_mall_ai_backend_coupon_id,
      shopping_mall_ai_backend_coupon_issuance_id:
        row.shopping_mall_ai_backend_coupon_issuance_id ?? null,
      bulk_code: row.bulk_code,
      issued_to_email: row.issued_to_email ?? null,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      redeemed_at: row.redeemed_at ? toISOStringSafe(row.redeemed_at) : null,
      revoked_at: row.revoked_at ? toISOStringSafe(row.revoked_at) : null,
    })),
  };
}
