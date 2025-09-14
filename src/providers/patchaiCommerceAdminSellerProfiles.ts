import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import { IPageIAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerProfiles";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search of seller profiles for admin-level moderation and analytics.
 *
 * Enables platform administrators to search and browse seller profiles from the
 * ai_commerce_seller_profiles table. Supports advanced query parameters for
 * filtering by display name, approval status, and other core profile
 * attributes. Returns paginated data for high-volume moderation and compliance
 * operations.
 *
 * @param props - The request object containing authentication and filter
 *   parameters.
 * @param props.admin - The authenticated admin payload (authorization
 *   required).
 * @param props.body - Filtering and pagination options (see
 *   IAiCommerceSellerProfiles.IRequest).
 * @returns Paginated list of seller profiles matching criteria, with pagination
 *   info.
 * @throws {Error} If query or database error occurs.
 */
export async function patchaiCommerceAdminSellerProfiles(props: {
  admin: AdminPayload;
  body: IAiCommerceSellerProfiles.IRequest;
}): Promise<IPageIAiCommerceSellerProfiles> {
  const { body } = props;
  // Use default pagination if not supplied
  const limit: number =
    body.limit !== undefined && body.limit > 0 ? body.limit : 20;
  const page: number = body.page !== undefined && body.page > 0 ? body.page : 1;
  const skip: number = (page - 1) * limit;
  // Dynamically build where condition based on optional filters
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.user_id !== undefined && {
      user_id: body.user_id,
    }),
    ...(body.display_name !== undefined &&
      body.display_name.length > 0 && {
        display_name: { contains: body.display_name },
      }),
    ...(body.approval_status !== undefined && {
      approval_status: body.approval_status,
    }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_profiles.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_seller_profiles.count({ where }),
  ]);
  const data: IAiCommerceSellerProfiles[] = rows.map((row) => {
    return {
      id: row.id,
      user_id: row.user_id,
      display_name: row.display_name,
      profile_metadata:
        row.profile_metadata !== undefined ? row.profile_metadata : undefined,
      approval_status: row.approval_status,
      suspension_reason:
        row.suspension_reason !== undefined ? row.suspension_reason : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== undefined && row.deleted_at !== null
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
