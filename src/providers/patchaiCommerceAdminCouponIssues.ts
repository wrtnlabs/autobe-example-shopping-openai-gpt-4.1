import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { IPageIAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCouponIssue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list coupon issues to users (admin only) from
 * ai_commerce_coupon_issues
 *
 * Returns a filtered, paginated list of coupon issues assigned to users,
 * supporting advanced analytics/reporting in the admin context. Filters include
 * coupon ID, user, status, date range for issuance, redemption, expiration, and
 * batch campaign reference. Pagination is always enforced. Admin authentication
 * is required as this list may expose sensitive business or personal data.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated administrator making the request (must be present)
 *   - Body: IAiCommerceCouponIssue.IRequest, specifying search filters and
 *       pagination options
 *
 * @returns Paginated summary list of coupon issues matching the filter, with
 *   pagination metadata
 * @throws {Error} If database read fails or access is unauthorized (handled at
 *   decorator/controller level)
 */
export async function patchaiCommerceAdminCouponIssues(props: {
  admin: AdminPayload;
  body: IAiCommerceCouponIssue.IRequest;
}): Promise<IPageIAiCommerceCouponIssue.ISummary> {
  const { admin, body } = props;

  // Pagination controls with immutable default (page=1/limit=50)
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (page - 1) * limit;

  // Build Prisma where input only including defined filter fields
  const where = {
    deleted_at: null,
    ...(body.coupon_id !== undefined && { coupon_id: body.coupon_id }),
    ...(body.issued_to !== undefined && { issued_to: body.issued_to }),
    ...(body.status !== undefined && { status: body.status }),
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
    ...(body.redeemed_at_from !== undefined || body.redeemed_at_to !== undefined
      ? {
          redeemed_at: {
            ...(body.redeemed_at_from !== undefined && {
              gte: body.redeemed_at_from,
            }),
            ...(body.redeemed_at_to !== undefined && {
              lte: body.redeemed_at_to,
            }),
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
    ...(body.batch_reference !== undefined && {
      batch_reference: body.batch_reference,
    }),
  };

  // Query data and count with single consistent filter
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_coupon_issues.findMany({
      where,
      orderBy: { issued_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        coupon_id: true,
        issued_to: true,
        status: true,
        issued_at: true,
        expires_at: true,
        redeemed_at: true,
        batch_reference: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_coupon_issues.count({ where }),
  ]);

  // Map the result rows to ISummary, converting all date fields with toISOStringSafe and handling optionals/nullables
  const data = rows.map((row) => ({
    id: row.id,
    coupon_id: row.coupon_id,
    issued_to: row.issued_to,
    status: row.status,
    issued_at: toISOStringSafe(row.issued_at),
    expires_at: toISOStringSafe(row.expires_at),
    redeemed_at: row.redeemed_at ? toISOStringSafe(row.redeemed_at) : undefined,
    batch_reference:
      typeof row.batch_reference === "string" ? row.batch_reference : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // Pagination result with Number() to ensure uint32 compatibility for typia tags
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
