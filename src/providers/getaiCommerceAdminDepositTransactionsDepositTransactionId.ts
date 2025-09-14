import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for one deposit transaction (by UUID) from the
 * ai_commerce_deposit_transactions table.
 *
 * This API returns full details for a specific deposit transaction, uniquely
 * identified by its UUID primary key. The transaction data is retrieved from
 * the ai_commerce_deposit_transactions table and includes all business
 * metadata, links to the account, event type, time, and status. Used for
 * transaction detail presentation, audit evidence, and compliance reporting.
 * Only the account owner, finance, or authorized admin roles may access this
 * endpoint.
 *
 * If the deposit transaction is not found or is soft-deleted, an error is
 * thrown.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.depositTransactionId - UUID identifier for the deposit
 *   transaction to retrieve
 * @returns The complete IAiCommerceDepositTransaction record
 * @throws {Error} If the deposit transaction is not found or is soft-deleted
 */
export async function getaiCommerceAdminDepositTransactionsDepositTransactionId(props: {
  admin: AdminPayload;
  depositTransactionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceDepositTransaction> {
  const { depositTransactionId } = props;
  const tx = await MyGlobal.prisma.ai_commerce_deposit_transactions.findFirst({
    where: {
      id: depositTransactionId,
      deleted_at: null,
    },
  });
  if (!tx) {
    throw new Error("Deposit transaction not found");
  }
  return {
    id: tx.id,
    deposit_account_id: tx.deposit_account_id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    counterparty_reference: tx.counterparty_reference ?? undefined,
    performed_at: toISOStringSafe(tx.performed_at),
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : undefined,
  };
}
