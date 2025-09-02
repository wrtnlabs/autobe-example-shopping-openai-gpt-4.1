import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import { IPageIShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoinTransaction";
import { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search transaction history for a specific coin wallet ledger.
 *
 * Returns a paginated list of all transaction (event) records for a specific
 * coin wallet, identified by its coinId. Transactions in
 * 'shopping_mall_ai_backend_coin_transactions' record changes to the wallet's
 * promotional wallet, such as accruals, usage, manual adjustments, campaign
 * events, and compliance incidents. This endpoint enables financial/audit
 * tracking across the wallet's history, supporting business review, compliance
 * casework, and campaign analysis. Response is pageable and filterable by event
 * type or date.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin, must be active and not deleted
 * @param props.coinId - The coin wallet ledger ID whose transactions to fetch
 * @param props.body - Query/filter options (change_type, amount range, date
 *   range, pagination)
 * @returns Paginated coin transaction ledger event list (with page metadata)
 * @throws {Error} When admin authentication fails
 */
export async function patch__shoppingMallAiBackend_admin_coins_$coinId_transactions(props: {
  admin: AdminPayload;
  coinId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCoinTransaction.IRequest;
}): Promise<IPageIShoppingMallAiBackendCoinTransaction> {
  const { admin, coinId, body } = props;

  // 1. Authorization: Ensure admin is active and not deleted
  const adminFound =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!adminFound) throw new Error("Admin authentication failure");

  // 2. Pagination, defaults
  const page =
    body &&
    typeof body.page === "number" &&
    !isNaN(Number(body.page)) &&
    body.page > 0
      ? Number(body.page)
      : 1;
  const limit =
    body &&
    typeof body.limit === "number" &&
    !isNaN(Number(body.limit)) &&
    body.limit > 0
      ? Number(body.limit)
      : 100;
  const skip = (page - 1) * limit;

  // 3. Build WHERE inline
  const where = {
    deleted_at: null,
    shopping_mall_ai_backend_coin_id: coinId,
    ...(body.change_type !== undefined &&
      body.change_type !== null && {
        change_type: body.change_type,
      }),
    // Amount filter
    ...(body.min_amount !== undefined &&
    body.min_amount !== null &&
    body.max_amount !== undefined &&
    body.max_amount !== null
      ? {
          amount: {
            gte: body.min_amount,
            lte: body.max_amount,
          },
        }
      : body.min_amount !== undefined && body.min_amount !== null
        ? {
            amount: {
              gte: body.min_amount,
            },
          }
        : body.max_amount !== undefined && body.max_amount !== null
          ? {
              amount: {
                lte: body.max_amount,
              },
            }
          : {}),
    // created_at date range filter
    ...(body.created_from !== undefined &&
    body.created_from !== null &&
    body.created_to !== undefined &&
    body.created_to !== null
      ? {
          created_at: {
            gte: body.created_from,
            lte: body.created_to,
          },
        }
      : body.created_from !== undefined && body.created_from !== null
        ? {
            created_at: {
              gte: body.created_from,
            },
          }
        : body.created_to !== undefined && body.created_to !== null
          ? {
              created_at: {
                lte: body.created_to,
              },
            }
          : {}),
  };

  // 4. Query & count
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.count({
      where,
    }),
  ]);

  // 5. Result mapping: format dates
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number,
      pages: Math.ceil(total / limit) as number,
    },
    data: transactions.map((tx) => ({
      id: tx.id,
      shopping_mall_ai_backend_coin_id: tx.shopping_mall_ai_backend_coin_id,
      shopping_mall_ai_backend_customer_id:
        tx.shopping_mall_ai_backend_customer_id ?? null,
      shopping_mall_ai_backend_seller_id:
        tx.shopping_mall_ai_backend_seller_id ?? null,
      change_type: tx.change_type,
      amount: tx.amount,
      transaction_reference: tx.transaction_reference ?? null,
      coin_before: tx.coin_before,
      coin_after: tx.coin_after,
      reason_code: tx.reason_code ?? null,
      description: tx.description ?? null,
      created_at: toISOStringSafe(tx.created_at),
      deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : null,
    })),
  };
}
