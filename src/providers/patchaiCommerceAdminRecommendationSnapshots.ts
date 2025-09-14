import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceRecommendationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceRecommendationSnapshot";
import { IPageIAiCommerceRecommendationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceRecommendationSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and filter recommendation snapshot logs for audit and AI analysis
 *
 * Authorized analytics/admins can query AI recommendation snapshot events for
 * compliance, explainability, and audit evidence. Advanced search supports
 * buyer, date range, and pagination. Returns detailed recommendations with full
 * contextual evidence for backend review in a paginated format.
 *
 * @param props - Arguments for search, includes authenticated admin and filter
 *   body
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Query filters: buyer id, timestamp range, pagination
 *   fields
 * @returns Paginated recommendation snapshot logs matching search criteria
 * @throws {Error} On invalid or out-of-bounds page/limit, or parameter format
 *   errors
 */
export async function patchaiCommerceAdminRecommendationSnapshots(props: {
  admin: AdminPayload;
  body: IAiCommerceRecommendationSnapshot.IRequest;
}): Promise<IPageIAiCommerceRecommendationSnapshot> {
  const { body } = props;

  // Setup pagination, enforcing page/limit >0 as per scenario
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  if (page < 1 || limit < 1)
    throw new Error("Invalid page or limit: both must be >= 1");
  const skip = (page - 1) * limit;

  // Prepare where clause inline for Prisma
  const where = {
    ...(body.ai_commerce_buyer_id !== undefined &&
      body.ai_commerce_buyer_id !== null && {
        ai_commerce_buyer_id: body.ai_commerce_buyer_id,
      }),
    ...((body.snapshot_timestamp_from !== undefined &&
      body.snapshot_timestamp_from !== null) ||
    (body.snapshot_timestamp_to !== undefined &&
      body.snapshot_timestamp_to !== null)
      ? {
          snapshot_timestamp: {
            ...(body.snapshot_timestamp_from !== undefined &&
              body.snapshot_timestamp_from !== null && {
                gte: toISOStringSafe(body.snapshot_timestamp_from),
              }),
            ...(body.snapshot_timestamp_to !== undefined &&
              body.snapshot_timestamp_to !== null && {
                lte: toISOStringSafe(body.snapshot_timestamp_to),
              }),
          },
        }
      : {}),
  };

  // Parallel query data & count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_recommendation_snapshots.findMany({
      where,
      orderBy: { snapshot_timestamp: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_recommendation_snapshots.count({ where }),
  ]);

  // Map output: All date values stringified, optional context_data as per type
  const data = rows.map(
    (row): IAiCommerceRecommendationSnapshot => ({
      id: row.id,
      ai_commerce_buyer_id: row.ai_commerce_buyer_id,
      snapshot_timestamp: toISOStringSafe(row.snapshot_timestamp),
      recommendations_data: row.recommendations_data,
      // context_data: optional/nullable per API type contract
      ...(row.context_data !== null ? { context_data: row.context_data } : {}),
    }),
  );

  // Strictly type pagination for IPage.IPagination (no as/type assertion), stripping tags for Prisma
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
