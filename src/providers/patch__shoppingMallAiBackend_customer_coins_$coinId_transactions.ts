import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import { IPageIShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoinTransaction";
import { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and retrieve paginated coin ledger transactions for a wallet by
 * coinId.
 *
 * Retrieves a paginated list of all transactions associated with a specific
 * coin ledger for the authenticated customer. Supports filtering by type,
 * amount range, and date range, as well as pagination. Only allows access if
 * the wallet is owned by the authenticated customer. Returns all business/audit
 * fields.
 *
 * @param props - Request properties
 * @param props.customer - Customer authentication context (must match coin
 *   ledger owner)
 * @param props.coinId - UUID of the coin wallet to query
 * @param props.body - Filter and pagination parameters for transaction search
 * @returns Paginated list of coin transaction history matching the filter and
 *   access constraints.
 * @throws {Error} When the specified coin wallet does not belong to the
 *   customer or is deleted.
 */
export async function patch__shoppingMallAiBackend_customer_coins_$coinId_transactions(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCoinTransaction.IRequest;
}): Promise<IPageIShoppingMallAiBackendCoinTransaction> {
  const { customer, coinId, body } = props;

  // 1. Ownership/auth check: coin must exist, belong to this customer, and not be deleted
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      shopping_mall_ai_backend_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (coin === null) {
    throw new Error(
      "Unauthorized: You do not own this coin ledger or it does not exist.",
    );
  }

  // 2. Pagination params (default page=1, limit=100; both positive int)
  const page =
    body.page !== undefined && Number(body.page) > 0 ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined &&
    Number(body.limit) > 0 &&
    Number(body.limit) <= 100
      ? Number(body.limit)
      : 100;

  // 3. Build where clause for transactions table according to request filters
  const where: Record<string, unknown> = {
    shopping_mall_ai_backend_coin_id: coinId,
    deleted_at: null,
    ...(body.change_type !== undefined && { change_type: body.change_type }),
    ...(body.min_amount !== undefined &&
      body.min_amount !== null && {
        amount: {
          ...(body.min_amount !== undefined && { gte: body.min_amount }),
          ...(body.max_amount !== undefined && { lte: body.max_amount }),
        },
      }),
    ...(body.min_amount === undefined &&
      body.max_amount !== undefined && {
        amount: { lte: body.max_amount },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // 4. Query total count and paged results in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.count({ where }),
    MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // 5. Map and format transaction results (ensure all dates and brands are correct)
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_coin_id: row.shopping_mall_ai_backend_coin_id,
    shopping_mall_ai_backend_customer_id:
      row.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      row.shopping_mall_ai_backend_seller_id ?? null,
    change_type: row.change_type,
    amount: row.amount,
    transaction_reference: row.transaction_reference ?? null,
    coin_before: row.coin_before,
    coin_after: row.coin_after,
    reason_code: row.reason_code ?? null,
    description: row.description ?? null,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  // 6. Pagination block
  const pages = limit > 0 ? Math.ceil(total / limit) : 1;

  // 7. Return paginated result structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
