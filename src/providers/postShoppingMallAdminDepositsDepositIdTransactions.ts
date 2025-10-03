import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminDepositsDepositIdTransactions(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.ICreate;
}): Promise<IShoppingMallDepositTransaction> {
  const { depositId, body } = props;
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findUnique({
    where: { id: depositId },
  });
  if (!deposit || deposit.deleted_at !== null) {
    throw new HttpException("Deposit account not found or deleted", 404);
  }
  if (deposit.status !== "active") {
    throw new HttpException("Deposit account is not active", 400);
  }
  if (deposit.shopping_mall_customer_id !== body.shopping_mall_customer_id) {
    throw new HttpException("Customer ID does not match deposit owner", 400);
  }
  let newBalance: number = deposit.balance;
  const isIncome = body.type === "income" || body.type === "refund";
  const isOutcome = body.type === "outcome";
  if (isIncome) {
    newBalance += body.amount;
  } else if (isOutcome) {
    if (body.amount > newBalance) {
      throw new HttpException("Insufficient balance for withdrawal", 400);
    }
    newBalance -= body.amount;
  } else if (body.type === "admin_adjustment") {
    newBalance += body.amount;
  } else if (body.type === "reversal") {
    newBalance += body.amount;
  } else {
    throw new HttpException("Unknown transaction type", 400);
  }
  if (newBalance < 0) {
    throw new HttpException("Resulting balance cannot be negative", 400);
  }
  const now = toISOStringSafe(new Date());
  const [updatedDeposit, createdTransaction] =
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_deposits.update({
        where: { id: depositId },
        data: {
          balance: newBalance,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_deposit_transactions.create({
        data: {
          id: v4(),
          shopping_mall_deposit_id: depositId,
          shopping_mall_customer_id: body.shopping_mall_customer_id,
          shopping_mall_order_id: body.shopping_mall_order_id ?? undefined,
          type: body.type,
          amount: body.amount,
          business_status: body.business_status,
          reason: body.reason ?? undefined,
          evidence_reference: body.evidence_reference ?? undefined,
          reversed_at: undefined,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
    ]);
  return {
    id: createdTransaction.id,
    shopping_mall_deposit_id: createdTransaction.shopping_mall_deposit_id,
    shopping_mall_customer_id: createdTransaction.shopping_mall_customer_id,
    shopping_mall_order_id:
      createdTransaction.shopping_mall_order_id ?? undefined,
    type: createdTransaction.type,
    amount: createdTransaction.amount,
    business_status: createdTransaction.business_status,
    reason: createdTransaction.reason ?? undefined,
    evidence_reference: createdTransaction.evidence_reference ?? undefined,
    reversed_at:
      createdTransaction.reversed_at === null ||
      typeof createdTransaction.reversed_at === "undefined"
        ? null
        : toISOStringSafe(createdTransaction.reversed_at),
    created_at: toISOStringSafe(createdTransaction.created_at),
    updated_at: toISOStringSafe(createdTransaction.updated_at),
    deleted_at:
      createdTransaction.deleted_at === null ||
      typeof createdTransaction.deleted_at === "undefined"
        ? null
        : toISOStringSafe(createdTransaction.deleted_at),
  };
}
