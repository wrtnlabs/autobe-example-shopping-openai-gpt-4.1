import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerAppeal";
import { IPageIAiCommerceSellerAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerAppeal";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list seller appeal cases (ai_commerce_seller_appeals) with
 * advanced filtering.
 *
 * This function retrieves a paginated, filtered list of seller appeal cases for
 * the authenticated seller. Appeals are filtered by the seller's own
 * seller_profile_id(s) only—no other seller's data is accessible. Filters
 * include status, appeal_type, date range (created_from, created_to), and
 * seller profile. Results are paginated and ordered by created_at descending.
 * No use of native Date type or type assertions.
 *
 * @param props Props object
 * @param props.seller Authenticated seller payload (must match
 *   ai_commerce_buyer.id)
 * @param props.body Optional filters and pagination control (status,
 *   appeal_type, created_from, created_to, page, limit)
 * @returns Paginated list of seller appeals as IPageIAiCommerceSellerAppeal
 * @throws Error if any database access fails
 */
export async function patchaiCommerceSellerSellerAppeals(props: {
  seller: SellerPayload;
  body: IAiCommerceSellerAppeal.IRequest;
}): Promise<IPageIAiCommerceSellerAppeal> {
  const { seller, body } = props;

  // Step 1: Get all seller_profile_ids for this seller
  const profiles = await MyGlobal.prisma.ai_commerce_seller_profiles.findMany({
    where: { user_id: seller.id, deleted_at: null },
    select: { id: true },
  });
  const profileIds: string[] = profiles.map((p) => p.id);

  if (profileIds.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: body.limit ?? 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Pagination parameters (strip tags via Number to get plain values)
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // WHERE clause with all filters (exclude null from required schema fields)
  const where = {
    seller_profile_id: { in: profileIds },
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.appeal_type !== undefined &&
      body.appeal_type !== null && { appeal_type: body.appeal_type }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Query data and count (no intermediate variable for where)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_seller_appeals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_seller_appeals.count({ where }),
  ]);

  // Ensure all output fields are mapped to correct API types and date formats
  const data = rows.map((row) => {
    return {
      id: row.id,
      seller_profile_id: row.seller_profile_id,
      appeal_type: row.appeal_type,
      appeal_data: row.appeal_data,
      status: row.status,
      resolution_notes: row.resolution_notes ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
