import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Get a specific deposit transaction's detailed audit information.
 *
 * Fetch detailed data for a specific deposit transaction event referenced by
 * its unique transactionId. Provides fields such as change type, amount,
 * balance before and after, audit references, manual/admin reason codes, and
 * timestamps.
 *
 * This endpoint supports both account holders (customer/seller) and authorized
 * administrators in investigating deposit ledger history, responding to
 * disputes, or confirming compliance events. Sensitive data access is governed
 * by strict authorization logic; non-owners or unauthorized requests are
 * forbidden. Expected errors: not found, unauthorized, or forbidden if
 * transaction does not belong to depositId or viewing rights are missing.
 *
 * @param props - The parameters for retrieving the transaction.
 * @param props.customer - Authenticated customer payload (must own the
 *   deposit/transaction)
 * @param props.depositId - UUID of the deposit ledger to which this transaction
 *   belongs
 * @param props.transactionId - UUID of the specific transaction record to fetch
 * @returns The complete transaction detail for the specified deposit
 *   transaction event
 * @throws {Error} When the record is not found or does not belong to the
 *   customer (forbidden)
 */
export async function get__shoppingMallAiBackend_customer_deposits_$depositId_transactions_$transactionId(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendDepositTransaction> {
  const { customer, depositId, transactionId } = props;
  const transaction =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposit_transactions.findFirst(
      {
        where: {
          id: transactionId,
          shopping_mall_ai_backend_deposit_id: depositId,
          deleted_at: null,
        },
      },
    );
  if (!transaction) {
    throw new Error("Deposit transaction not found");
  }
  if (transaction.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: you do not have access to this transaction");
  }
  return {
    id: transaction.id,
    shopping_mall_ai_backend_deposit_id:
      transaction.shopping_mall_ai_backend_deposit_id,
    shopping_mall_ai_backend_customer_id:
      transaction.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      transaction.shopping_mall_ai_backend_seller_id,
    change_type: transaction.change_type,
    amount: transaction.amount,
    transaction_reference: transaction.transaction_reference,
    balance_before: transaction.balance_before,
    balance_after: transaction.balance_after,
    reason_code: transaction.reason_code,
    description: transaction.description,
    created_at: toISOStringSafe(transaction.created_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : null,
  };
}
