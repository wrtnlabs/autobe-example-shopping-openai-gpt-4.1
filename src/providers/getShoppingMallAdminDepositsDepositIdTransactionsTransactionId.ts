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

export async function getShoppingMallAdminDepositsDepositIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDepositTransaction> {
  const transaction =
    await MyGlobal.prisma.shopping_mall_deposit_transactions.findFirst({
      where: {
        id: props.transactionId,
        shopping_mall_deposit_id: props.depositId,
        deleted_at: null,
      },
    });
  if (!transaction) {
    throw new HttpException("Deposit transaction not found", 404);
  }
  return {
    id: transaction.id,
    shopping_mall_deposit_id: transaction.shopping_mall_deposit_id,
    shopping_mall_customer_id: transaction.shopping_mall_customer_id,
    shopping_mall_order_id: transaction.shopping_mall_order_id ?? undefined,
    type: transaction.type,
    amount: transaction.amount,
    business_status: transaction.business_status,
    reason: transaction.reason ?? undefined,
    evidence_reference: transaction.evidence_reference ?? undefined,
    reversed_at: transaction.reversed_at
      ? toISOStringSafe(transaction.reversed_at)
      : undefined,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : null,
  };
}
