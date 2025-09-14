import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detailed information for one deposit transaction (by UUID).
 *
 * This function retrieves a single deposit transaction from the
 * ai_commerce_deposit_transactions table, identified by its unique UUID. It
 * enforces access control so that only the owning buyer may access their
 * deposit transactions. The full record is returned for review and audit
 * evidence, with all time fields normalized as ISO date-time strings.
 *
 * @param props - Request properties
 * @param props.buyer - The authenticated buyer requesting their deposit
 *   transaction detail
 * @param props.depositTransactionId - UUID identifier for the deposit
 *   transaction to retrieve
 * @returns The complete deposit transaction record for the buyer
 * @throws {Error} When the transaction is not found or access is forbidden
 */
export async function getaiCommerceBuyerDepositTransactionsDepositTransactionId(props: {
  buyer: BuyerPayload;
  depositTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceDepositTransaction> {
  const { buyer, depositTransactionId } = props;
  // Step 1: Fetch transaction by ID and non-deleted
  const transaction =
    await MyGlobal.prisma.ai_commerce_deposit_transactions.findFirst({
      where: {
        id: depositTransactionId,
        deleted_at: null,
      },
      select: {
        id: true,
        deposit_account_id: true,
        type: true,
        amount: true,
        status: true,
        counterparty_reference: true,
        performed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!transaction) throw new Error("Deposit transaction not found");

  // Step 2: Access control - only owner of the deposit account may view
  const account = await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
    where: {
      id: transaction.deposit_account_id,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
    },
  });
  if (!account || account.user_id !== buyer.id)
    throw new Error("Forbidden: You do not have access to this transaction");

  // Step 3: Map to DTO
  return {
    id: transaction.id,
    deposit_account_id: transaction.deposit_account_id,
    type: transaction.type,
    amount: transaction.amount,
    status: transaction.status,
    counterparty_reference:
      transaction.counterparty_reference === null
        ? undefined
        : transaction.counterparty_reference,
    performed_at: toISOStringSafe(transaction.performed_at),
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at:
      transaction.deleted_at === null || transaction.deleted_at === undefined
        ? undefined
        : toISOStringSafe(transaction.deleted_at),
  };
}
