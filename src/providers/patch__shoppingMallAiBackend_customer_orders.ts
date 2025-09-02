import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import { IPageIShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a paginated, filtered list of orders with advanced search.
 * (shopping_mall_ai_backend_orders)
 *
 * Search for and retrieve a filtered, paginated list of orders across customer
 * context. This operation enables complex queries by status, channel, currency,
 * customer/seller, date range, and amount. Pagination and sorting is provided,
 * and the response includes summary details for each order. Access control is
 * enforced based on the user's role and ownership context. Sensitive details
 * are masked for non-owner queries unless policy grants full access (e.g.,
 * seller or admin cases).
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.body - Search and filter parameters for order search and
 *   pagination
 * @returns Paginated result containing order summaries matching query criteria.
 * @throws {Error} When the search parameters are invalid or access is denied
 */
export async function patch__shoppingMallAiBackend_customer_orders(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendOrder.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrder.ISummary> {
  const { customer, body } = props;

  // Validate and set pagination defaults
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 20;

  // Build where condition (always scoped to requesting customer)
  const where = {
    deleted_at: null,
    shopping_mall_ai_backend_customer_id: customer.id,
    ...(body.filter?.channel_id !== undefined &&
      body.filter?.channel_id !== null && {
        shopping_mall_ai_backend_channel_id: body.filter.channel_id,
      }),
    ...(body.filter?.seller_id !== undefined &&
      body.filter?.seller_id !== null && {
        shopping_mall_ai_backend_seller_id: body.filter.seller_id,
      }),
    ...(body.filter?.status !== undefined &&
      body.filter?.status !== null && {
        status: body.filter.status,
      }),
    ...(body.filter?.currency !== undefined &&
      body.filter?.currency !== null && {
        currency: body.filter.currency,
      }),
    ...((body.filter?.ordered_at_from !== undefined &&
      body.filter?.ordered_at_from !== null) ||
    (body.filter?.ordered_at_to !== undefined &&
      body.filter?.ordered_at_to !== null)
      ? {
          ordered_at: {
            ...(body.filter?.ordered_at_from !== undefined &&
              body.filter?.ordered_at_from !== null && {
                gte: body.filter.ordered_at_from,
              }),
            ...(body.filter?.ordered_at_to !== undefined &&
              body.filter?.ordered_at_to !== null && {
                lte: body.filter.ordered_at_to,
              }),
          },
        }
      : {}),
    ...(body.filter?.total_amount_min !== undefined ||
    body.filter?.total_amount_max !== undefined
      ? {
          total_amount: {
            ...(body.filter?.total_amount_min !== undefined && {
              gte: body.filter.total_amount_min,
            }),
            ...(body.filter?.total_amount_max !== undefined && {
              lte: body.filter.total_amount_max,
            }),
          },
        }
      : {}),
  };

  // Supported sort fields only (fallback is ordered_at)
  const allowedSortFields = [
    "id",
    "code",
    "status",
    "total_amount",
    "currency",
    "ordered_at",
    "closed_at",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "ordered_at";
  const orderBy = { [sortField]: "desc" };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Query DB for records and total (in parallel)
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_orders.count({ where }),
    MyGlobal.prisma.shopping_mall_ai_backend_orders.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        code: true,
        status: true,
        total_amount: true,
        currency: true,
        ordered_at: true,
        closed_at: true,
      },
    }),
  ]);

  // Package result: convert all date fields and conform to ISummary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
    data: records.map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      total_amount: row.total_amount,
      currency: row.currency,
      ordered_at: toISOStringSafe(row.ordered_at),
      closed_at:
        row.closed_at !== null && row.closed_at !== undefined
          ? toISOStringSafe(row.closed_at)
          : null,
    })),
  };
}
