import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new deposit transaction (recharge, withdrawal, payment, refund) for
 * an account with proper validation and audit.
 *
 * This endpoint creates a new deposit transaction entry in
 * ai_commerce_deposit_transactions and updates the target deposit account's
 * balance atomically. Only an authenticated admin may perform this operation;
 * it is subject to all rules: account must exist and be active, transaction
 * type and amount must fit business logic, and withdrawals/payments cannot
 * overdraw the account.
 *
 * All creates are transactional, immutable, and generate full audit/compliance
 * records. All datetime fields use UTC ISO8601 strings.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin who performs this creation
 * @param props.body - Transaction creation data (account, type, amount, time,
 *   status)
 * @returns Details of the newly created deposit transaction row
 * @throws {Error} If account is not found/active, business rule fails, or
 *   balance would become negative
 */
export async function postaiCommerceAdminDepositTransactions(props: {
  admin: AdminPayload;
  body: IAiCommerceDepositTransaction.ICreate;
}): Promise<IAiCommerceDepositTransaction> {
  const { admin, body } = props;
  const now = toISOStringSafe(new Date());

  // Verify account exists and is active
  const account = await MyGlobal.prisma.ai_commerce_deposit_accounts.findFirst({
    where: {
      id: body.deposit_account_id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!account) {
    throw new Error("Deposit account does not exist or is not active");
  }

  // Supported business types
  const allowedTypes = ["recharge", "withdraw", "payment", "refund"];
  if (!allowedTypes.includes(body.type)) {
    throw new Error(`Invalid transaction type: ${body.type}`);
  }

  // Amount sign convention
  if (
    (body.type === "withdraw" || body.type === "payment") &&
    body.amount >= 0
  ) {
    throw new Error("Withdrawals and payments must use negative amount");
  }
  if (
    (body.type === "recharge" || body.type === "refund") &&
    body.amount <= 0
  ) {
    throw new Error("Recharges and refunds must use positive amount");
  }

  // Sufficient funds for debits
  const projectedBalance = account.balance + body.amount;
  if (
    (body.type === "withdraw" || body.type === "payment") &&
    projectedBalance < 0
  ) {
    throw new Error("Insufficient balance on deposit account");
  }

  // Generate IDs and perform transaction atomically
  const transactionId = v4();
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const record = await tx.ai_commerce_deposit_transactions.create({
      data: {
        id: transactionId,
        deposit_account_id: body.deposit_account_id,
        type: body.type,
        amount: body.amount,
        status: body.status,
        counterparty_reference: body.counterparty_reference ?? null,
        performed_at: body.performed_at,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.ai_commerce_deposit_accounts.update({
      where: { id: body.deposit_account_id },
      data: {
        balance: projectedBalance,
        updated_at: now,
      },
    });
    return record;
  });

  return {
    id: created.id,
    deposit_account_id: created.deposit_account_id,
    type: created.type,
    amount: created.amount,
    status: created.status,
    counterparty_reference: created.counterparty_reference ?? null,
    performed_at: created.performed_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
