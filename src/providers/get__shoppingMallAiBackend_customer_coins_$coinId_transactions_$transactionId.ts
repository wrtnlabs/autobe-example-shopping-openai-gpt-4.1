import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a specific coin transaction within a coin ledger by coinId and
 * transactionId.
 *
 * This endpoint retrieves a specific coin transaction associated with a given
 * coinId and transactionId. Each transaction in the
 * shopping_mall_ai_backend_coin_transactions table reflects a change (usage,
 * accrual, expiry, adjustment, admin action) on the coin ledger for a customer
 * or seller.
 *
 * Users are only able to access their own transactions; admins may retrieve
 * records for compliance and business reasons. Data includes all audit
 * metadata, balances, type, reason, and contextual description, supporting
 * evidence needs or transaction troubleshooting.
 *
 * Access is strictly restricted to ledger owners or administrative roles (here:
 * customer only). Responses are comprehensive and meet all audit/compliance
 * requirements. Errors are thrown for missing, restricted, or non-existent
 * records.
 *
 * @param props - The input properties for this operation
 * @param props.customer - The authenticated customer requesting the transaction
 * @param props.coinId - The coin ledger identifier the transaction belongs to
 * @param props.transactionId - The specific transaction identifier to fetch
 * @returns The full immutable coin transaction audit/event record, with all
 *   business and compliance fields
 * @throws {Error} If the coin ledger does not exist, is deleted, not owned by
 *   the customer, or the transaction does not exist or is inaccessible
 */
export async function get__shoppingMallAiBackend_customer_coins_$coinId_transactions_$transactionId(props: {
  customer: CustomerPayload;
  coinId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCoinTransaction> {
  const { customer, coinId, transactionId } = props;

  // Step 1: Ensure the coin ledger exists, is active, and belongs to this customer
  const coin = await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
    where: {
      id: coinId,
      deleted_at: null,
      shopping_mall_ai_backend_customer_id: customer.id,
    },
  });
  if (!coin) {
    throw new Error("Coin ledger not found or not owned by customer");
  }

  // Step 2: Find the transaction record, ensure it references the coin, not soft-deleted
  const tx =
    await MyGlobal.prisma.shopping_mall_ai_backend_coin_transactions.findFirst({
      where: {
        id: transactionId,
        shopping_mall_ai_backend_coin_id: coinId,
        deleted_at: null,
      },
    });
  if (!tx) {
    throw new Error("Transaction not found in this coin ledger");
  }
  // Step 3: Confirm this transaction is for this customer's coin (defensive double-check)
  if (tx.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: transaction does not belong to this customer");
  }

  // Step 4: Map and return, ensuring correct branding and ISO date format
  return {
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
  };
}
