import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { IPageIShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoin";
import { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and list digital coin ledgers for users or sellers with filtering and
 * pagination.
 *
 * This endpoint allows authenticated customers to search for and retrieve a
 * paginated collection of their own digital coin ledgers, as stored in the
 * shopping_mall_ai_backend_coins table. Filtering is supported via various
 * wallet balance constraints, creation time range, and standard pagination
 * parameters. Only ledgers belonging to the authenticated customer may be
 * retrieved by this operation. Soft-deleted ledgers (deleted_at != null) are
 * excluded.
 *
 * All date/datetime values in the output are formatted as ISO8601 strings with
 * 'date-time' branding. Pagination metadata reflects the result window, and
 * result lists are sorted by creation time descending; the most recently
 * created wallets appear first.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the query
 * @param props.body - Coin ledger search, filter, and pagination options
 * @returns Paginated collection of coin ledgers matching the search criteria
 * @throws {Error} When there is an unexpected database or system error
 */
export async function patch__shoppingMallAiBackend_customer_coins(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendCoin.IRequest;
}): Promise<IPageIShoppingMallAiBackendCoin> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [rows, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coins.findMany({
      where: {
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: customer.id,
        ...(body.min_usable_coin !== undefined && {
          usable_coin: { gte: body.min_usable_coin },
        }),
        ...(body.max_usable_coin !== undefined && {
          usable_coin: { lte: body.max_usable_coin },
        }),
        ...(body.created_from !== undefined && {
          created_at: { gte: body.created_from },
        }),
        ...(body.created_to !== undefined && {
          created_at: { lte: body.created_to },
        }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coins.count({
      where: {
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: customer.id,
        ...(body.min_usable_coin !== undefined && {
          usable_coin: { gte: body.min_usable_coin },
        }),
        ...(body.max_usable_coin !== undefined && {
          usable_coin: { lte: body.max_usable_coin },
        }),
        ...(body.created_from !== undefined && {
          created_at: { gte: body.created_from },
        }),
        ...(body.created_to !== undefined && {
          created_at: { lte: body.created_to },
        }),
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_customer_id:
      row.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      row.shopping_mall_ai_backend_seller_id ?? null,
    total_accrued: row.total_accrued,
    usable_coin: row.usable_coin,
    expired_coin: row.expired_coin,
    on_hold_coin: row.on_hold_coin,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));
  const pages = Math.ceil(records / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(records),
      pages: Number(pages),
    },
    data,
  };
}
