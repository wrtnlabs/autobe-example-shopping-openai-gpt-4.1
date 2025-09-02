import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileageTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a specific mileage ledger transaction by mileageId and
 * transactionId.
 *
 * This endpoint allows authorized customers to fetch a detailed, immutable
 * transaction entry from their own mileage ledger, including accrual,
 * redemption, expiration, or adjustment records. Access is strictly
 * enforced—only the mileage account owner can retrieve their own transaction.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload (must own the mileage
 *   ledger)
 * @param props.mileageId - UUID of the parent mileage ledger
 * @param props.transactionId - UUID of the transaction record
 * @returns The detailed mileage transaction record for audit and compliance
 * @throws {Error} - When the transaction does not exist or is soft-deleted
 * @throws {Error} - When the requesting user does not own the transaction
 */
export async function get__shoppingMallAiBackend_customer_mileages_$mileageId_transactions_$transactionId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendMileageTransaction> {
  const { customer, mileageId, transactionId } = props;

  // Find the eligible transaction with soft-delete and ownership filter
  const transaction =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileage_transactions.findFirst(
      {
        where: {
          id: transactionId,
          shopping_mall_ai_backend_mileage_id: mileageId,
          deleted_at: null,
        },
      },
    );
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  if (transaction.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this transaction");
  }

  return {
    id: transaction.id,
    shopping_mall_ai_backend_mileage_id:
      transaction.shopping_mall_ai_backend_mileage_id,
    shopping_mall_ai_backend_customer_id:
      transaction.shopping_mall_ai_backend_customer_id ?? null,
    shopping_mall_ai_backend_seller_id:
      transaction.shopping_mall_ai_backend_seller_id ?? null,
    change_type: transaction.change_type,
    amount: transaction.amount,
    transaction_reference: transaction.transaction_reference ?? null,
    mileage_before: transaction.mileage_before,
    mileage_after: transaction.mileage_after,
    reason_code: transaction.reason_code ?? null,
    description: transaction.description ?? null,
    created_at: toISOStringSafe(transaction.created_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : null,
  };
}
