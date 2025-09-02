import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve the details of a single coin wallet transaction event record by its
 * unique ID and parent coin wallet, strictly for admin compliance/audit
 * review.
 *
 * Returns all immutable, append-only business/audit fields of a wallet
 * transaction, including before/after balances, actor context, correlation, and
 * timestamps. Only accessible by platform administrators, for evidence and
 * regulatory trail purposes. Throws if not found or soft deleted.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator context (authorization
 *   enforced)
 * @param props.coinId - Parent coin wallet ID (UUID string, required)
 * @param props.transactionId - Unique transaction event ID (UUID string,
 *   required)
 * @returns Complete coin wallet transaction event audit record
 * @throws {Error} If transaction record is not found or has been deleted
 */
export async function get__shoppingMallAiBackend_admin_coins_$coinId_transactions_$transactionId(props: {
  admin: AdminPayload;
  coinId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCoinTransaction> {
  const { coinId, transactionId } = props;
  // Find by (id, shopping_mall_ai_backend_coin_id, not soft deleted)
  const txn =
    await MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.findFirstOrThrow(
      {
        where: {
          id: transactionId,
          shopping_mall_ai_backend_coin_id: coinId,
          deleted_at: null,
        },
      },
    );
  return {
    id: txn.id,
    shopping_mall_ai_backend_coin_id: txn.shopping_mall_ai_backend_coin_id,
    shopping_mall_ai_backend_customer_id:
      txn.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      txn.shopping_mall_ai_backend_seller_id ?? null,
    change_type: txn.change_type,
    amount: txn.amount,
    transaction_reference: txn.transaction_reference ?? null,
    coin_before: txn.coin_before,
    coin_after: txn.coin_after,
    reason_code: txn.reason_code ?? null,
    description: txn.description ?? null,
    created_at: toISOStringSafe(txn.created_at),
    deleted_at: txn.deleted_at ? toISOStringSafe(txn.deleted_at) : null,
  };
}
