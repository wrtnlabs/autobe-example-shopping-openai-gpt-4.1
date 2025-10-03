import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerDepositsDepositIdTransactions(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.ICreate;
}): Promise<IShoppingMallDepositTransaction> {
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findUnique({
    where: { id: props.depositId },
  });
  if (!deposit || deposit.deleted_at !== null) {
    throw new HttpException("Deposit account not found", 404);
  }
  if (deposit.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Cannot operate on others' deposit",
      403,
    );
  }
  const allowedTypes = [
    "income",
    "outcome",
    "refund",
    "admin_adjustment",
    "reversal",
  ];
  if (!allowedTypes.includes(props.body.type)) {
    throw new HttpException("Invalid transaction type", 400);
  }
  let newBalance = deposit.balance;
  if (
    props.body.type === "income" ||
    props.body.type === "refund" ||
    props.body.type === "admin_adjustment"
  ) {
    newBalance = deposit.balance + props.body.amount;
  } else if (props.body.type === "outcome" || props.body.type === "reversal") {
    if (deposit.balance < props.body.amount) {
      throw new HttpException("Insufficient balance for withdrawal", 400);
    }
    newBalance = deposit.balance - props.body.amount;
  }
  const now = toISOStringSafe(new Date());
  const tx = await MyGlobal.prisma.shopping_mall_deposit_transactions.create({
    data: {
      id: v4(),
      shopping_mall_deposit_id: deposit.id,
      shopping_mall_customer_id: deposit.shopping_mall_customer_id,
      shopping_mall_order_id:
        props.body.shopping_mall_order_id !== undefined
          ? props.body.shopping_mall_order_id
          : null,
      type: props.body.type,
      amount: props.body.amount,
      business_status: props.body.business_status,
      reason: props.body.reason !== undefined ? props.body.reason : null,
      evidence_reference:
        props.body.evidence_reference !== undefined
          ? props.body.evidence_reference
          : null,
      reversed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_deposits.update({
    where: { id: deposit.id },
    data: {
      balance: newBalance,
      updated_at: now,
    },
  });
  return {
    id: tx.id,
    shopping_mall_deposit_id: tx.shopping_mall_deposit_id,
    shopping_mall_customer_id: tx.shopping_mall_customer_id,
    shopping_mall_order_id: tx.shopping_mall_order_id ?? undefined,
    type: tx.type,
    amount: tx.amount,
    business_status: tx.business_status,
    reason: tx.reason ?? undefined,
    evidence_reference: tx.evidence_reference ?? undefined,
    reversed_at: tx.reversed_at ? toISOStringSafe(tx.reversed_at) : undefined,
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : null,
  };
}
