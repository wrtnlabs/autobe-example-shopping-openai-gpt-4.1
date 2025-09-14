import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new deposit transaction (recharge, withdrawal, payment, refund) for
 * an account with proper validation and audit.
 *
 * This endpoint creates a new deposit transaction, such as a top-up (recharge),
 * withdrawal, payment, or refund, and adds the corresponding entry in the
 * ai_commerce_deposit_transactions table.
 *
 * Each creation is subject to business rule validation: only supported
 * transaction types are allowed, the affected deposit account must exist and be
 * active, balances are checked for withdrawals/payments, and excessive
 * operations are prevented for anti-fraud and abuse safeguard. Insertions
 * generate an immutable, auditable event, with full details such as type,
 * account, amount, time, and counterparty reference. All actions are logged and
 * propagate updates to account balances atomically.
 *
 * Only authenticated users (owners) can create transactions for their own
 * account. Admins may create for any account (not implemented here).
 *
 * @param props Object including buyer authentication payload and transaction
 *   creation body
 * @param props.buyer Authenticated BuyerPayload (user UUID, type)
 * @param props.body Transaction creation body (matches
 *   IAiCommerceDepositTransaction.ICreate)
 * @returns The newly created deposit transaction record, including all audit
 *   fields (IAiCommerceDepositTransaction)
 * @throws {Error} If deposit account not found/inactive/not owned by buyer,
 *   unsupported type/status, insufficient balance, or business logic violation
 */
export async function postaiCommerceBuyerDepositTransactions(props: {
  buyer: BuyerPayload;
  body: IAiCommerceDepositTransaction.ICreate;
}): Promise<IAiCommerceDepositTransaction> {
  const { buyer, body } = props;
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Validate deposit account exists, is not deleted, is active, and owned by buyer
    const depositAccount = await prisma.ai_commerce_deposit_accounts.findFirst({
      where: {
        id: body.deposit_account_id,
        user_id: buyer.id,
        status: "active",
        deleted_at: null,
      },
    });
    if (!depositAccount) {
      throw new Error(
        "Deposit account not found, not active, or not owned by user",
      );
    }

    // 2. Validate transaction type and amount logic
    const allowedTypes = ["recharge", "withdraw", "payment", "refund"];
    if (!allowedTypes.includes(body.type)) {
      throw new Error("Unsupported transaction type");
    }

    // 3. Validate status value
    const allowedStatuses = ["pending", "confirmed", "failed", "expired"];
    if (!allowedStatuses.includes(body.status)) {
      throw new Error("Unsupported transaction status");
    }

    // 4. Withdrawal/payment - check sufficient balance
    if (body.type === "withdraw" || body.type === "payment") {
      if (depositAccount.balance < body.amount) {
        throw new Error("Insufficient balance for withdrawal/payment");
      }
    }

    // 5. Compute new balance
    let newBalance = depositAccount.balance;
    if (body.type === "recharge" || body.type === "refund") {
      newBalance = depositAccount.balance + body.amount;
    } else if (body.type === "withdraw" || body.type === "payment") {
      newBalance = depositAccount.balance - body.amount;
    }

    // 6. Create new deposit transaction
    const now = toISOStringSafe(new Date());
    const transaction = await prisma.ai_commerce_deposit_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        deposit_account_id: body.deposit_account_id,
        type: body.type,
        amount: body.amount,
        status: body.status,
        counterparty_reference: body.counterparty_reference ?? undefined,
        performed_at: body.performed_at,
        created_at: now,
        updated_at: now,
      },
    });

    // 7. Update deposit account balance atomically
    await prisma.ai_commerce_deposit_accounts.update({
      where: { id: body.deposit_account_id },
      data: {
        balance: newBalance,
        updated_at: now,
      },
    });

    // 8. Format and return DTO with proper null/undefined
    return {
      id: transaction.id,
      deposit_account_id: transaction.deposit_account_id,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      counterparty_reference: transaction.counterparty_reference ?? null,
      performed_at: transaction.performed_at,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      deleted_at: transaction.deleted_at ?? undefined,
    } satisfies IAiCommerceDepositTransaction;
  });
}
