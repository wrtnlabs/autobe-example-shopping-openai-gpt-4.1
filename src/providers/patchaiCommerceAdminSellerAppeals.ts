import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { IPageIAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list seller appeal cases (ai_commerce_seller_appeals) with
 * advanced filtering.
 *
 * Retrieves a paginated list of seller appeals for administrators, filtered by
 * any combination of seller_profile_id, appeal_type, status, and created_at
 * range. Ensures compliance by excluding soft-deleted records and includes all
 * necessary details for review workflows.
 *
 * Authentication: Administrator required. Sellers may only access their own
 * records via a different endpoint.
 *
 * @param props - Input object containing:
 * @param admin - The authenticated admin making the request (role:
 *   AdminPayload)
 * @param body - Filter and pagination criteria
 *   (IAiCommerceSellerAppeal.IRequest)
 * @returns Paginated list of matching seller appeals and pagination info.
 * @throws {Error} If database operations fail
 */
export async function patchaiCommerceAdminSellerAppeals(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerAppeal.IRequest;
}): Promise<IPageIAiCommerceSellerAppeal> {
  const { body } = props;
  // Pagination: page is 1-based (default: 1), limit default 20, max 100
  const page = body.page !== undefined && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;

  // Build filters
  const where = {
    deleted_at: null,
    ...(body.seller_profile_id !== undefined && {
      seller_profile_id: body.seller_profile_id,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.appeal_type !== undefined && {
      appeal_type: body.appeal_type,
    }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && {
              gte: body.created_from,
            }),
            ...(body.created_to !== undefined && {
              lte: body.created_to,
            }),
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_appeals.count({ where }),
    MyGlobal.prisma.ai_commerce_seller_appeals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Map database rows to DTO, ensuring all date fields are correctly converted
  const data = records.map((row) => ({
    id: row.id,
    seller_profile_id: row.seller_profile_id,
    appeal_type: row.appeal_type,
    appeal_data: row.appeal_data,
    status: row.status,
    resolution_notes: row.resolution_notes ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

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
