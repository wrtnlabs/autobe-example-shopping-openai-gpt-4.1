import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import { IPageIShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoupon";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin search all coupons with advanced filtering and pagination
 * (shopping_mall_ai_backend_coupons).
 *
 * This endpoint allows administrators to search and filter the entire coupon
 * catalog using advanced criteria, including code, title, type, status,
 * assigned channel, seller, usage limits, and expiration dates. Supports
 * pagination, sorting, and keyword searching, returning only visible (not
 * soft-deleted) coupons. Fields such as issued/used counts and campaign
 * metadata are included in the results. Only admin users may access this
 * endpoint.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin account (required for
 *   authorization)
 * @param props.body - Search and filter criteria for coupons, including
 *   pagination and sort options
 * @returns Paginated result set of coupon summaries matching the specified
 *   filters and pagination
 * @throws {Error} When the admin is unauthorized or provides invalid
 *   filters/page
 */
export async function patch__shoppingMallAiBackend_admin_coupons(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCoupon.IRequest;
}): Promise<IPageIShoppingMallAiBackendCoupon.ISummary> {
  const { body } = props;

  // Pagination parameters with fallback
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Where clause: match only visible (not soft-deleted) coupons and apply advanced filters
  const where = {
    deleted_at: null,
    ...(body.code !== undefined &&
      body.code !== null &&
      body.code.length > 0 && {
        code: { contains: body.code, mode: "insensitive" as const },
      }),
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && {
        title: { contains: body.title, mode: "insensitive" as const },
      }),
    ...(body.type !== undefined &&
      body.type !== null && {
        type: body.type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && {
        shopping_mall_ai_backend_channel_id: body.channel_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_ai_backend_seller_id: body.seller_id,
      }),
    ...((body.expires_from !== undefined && body.expires_from !== null) ||
    (body.expires_to !== undefined && body.expires_to !== null)
      ? {
          expires_at: {
            ...(body.expires_from !== undefined &&
              body.expires_from !== null && {
                gte: body.expires_from,
              }),
            ...(body.expires_to !== undefined &&
              body.expires_to !== null && {
                lte: body.expires_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupons.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        status: true,
        expires_at: true,
        issued_count: true,
        used_count: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupons.count({ where }),
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
      code: row.code,
      title: row.title,
      type: row.type,
      status: row.status,
      expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : null,
      issued_count: row.issued_count,
      used_count: row.used_count,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
