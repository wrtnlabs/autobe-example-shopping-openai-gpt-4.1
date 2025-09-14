import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchHistory";
import { IPageIAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSearchHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and paginate user search histories for discovery analytics
 *
 * This endpoint enables analytics teams or authorized admins to query search
 * histories by text query, user, filter context (e.g. device, locale), and date
 * range, supporting rich business insights about discovery behavior and
 * trends.
 *
 * Because of the sensitivity of search histories, this operation is restricted
 * to admins with analytics, support, or compliance needs. Advanced parameters
 * support filtering by user, anonymization state, and aggregate calculation
 * when paginated over larger datasets.
 *
 * The response is a paginated, filtered dataset with summary stats as well as
 * individual logs for inspection or downstream analysis. Throws error on
 * invalid or unauthorized input.
 *
 * @param props - Object containing admin authentication and request
 *   filtering/pagination
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Request body containing filter/search/pagination criteria
 * @returns Paginated list of search histories matching filter
 * @throws {Error} If page or limit is less than 1
 */
export async function patchaiCommerceAdminSearchHistories(props: {
  admin: AdminPayload;
  body: IAiCommerceSearchHistory.IRequest;
}): Promise<IPageIAiCommerceSearchHistory> {
  const { body } = props;

  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 20;
  if (page < 1 || limit < 1) throw new Error("Invalid pagination parameter");

  const skip: number = (page - 1) * limit;

  const where = {
    ...(body.query_string !== undefined &&
      body.query_string !== null && {
        query_string: { contains: body.query_string },
      }),
    ...(body.ai_commerce_buyer_id !== undefined &&
      body.ai_commerce_buyer_id !== null && {
        ai_commerce_buyer_id: body.ai_commerce_buyer_id,
      }),
    ...(body.locale !== undefined &&
      body.locale !== null && {
        locale: body.locale,
      }),
    ...((body.search_timestamp_from !== undefined &&
      body.search_timestamp_from !== null) ||
    (body.search_timestamp_to !== undefined &&
      body.search_timestamp_to !== null)
      ? {
          search_timestamp: {
            ...(body.search_timestamp_from !== undefined &&
              body.search_timestamp_from !== null && {
                gte: body.search_timestamp_from,
              }),
            ...(body.search_timestamp_to !== undefined &&
              body.search_timestamp_to !== null && {
                lte: body.search_timestamp_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_search_histories.findMany({
      where,
      skip,
      take: limit,
      orderBy: { search_timestamp: "desc" },
    }),
    MyGlobal.prisma.ai_commerce_search_histories.count({ where }),
  ]);

  const data: IAiCommerceSearchHistory[] = rows.map((row) => ({
    id: row.id,
    ai_commerce_buyer_id:
      row.ai_commerce_buyer_id === null ? undefined : row.ai_commerce_buyer_id,
    query_string: row.query_string,
    filters_applied:
      row.filters_applied === null ? undefined : row.filters_applied,
    result_count: row.result_count,
    search_timestamp: toISOStringSafe(row.search_timestamp),
    locale: row.locale === null ? undefined : row.locale,
  }));

  const records = total;
  const pages = Math.ceil(records / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: pages,
    },
    data,
  };
}
