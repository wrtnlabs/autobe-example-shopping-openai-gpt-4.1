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

export async function putShoppingMallAdminDepositsDepositIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.IUpdate;
}): Promise<IShoppingMallDepositTransaction> {
  // 1. Find transaction, enforce matching deposit
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

  // 2. Update only allowed fields for admin
  const updated =
    await MyGlobal.prisma.shopping_mall_deposit_transactions.update({
      where: { id: props.transactionId },
      data: {
        business_status: props.body.business_status ?? undefined,
        reason: props.body.reason ?? undefined,
        evidence_reference: props.body.evidence_reference ?? undefined,
        reversed_at: props.body.reversed_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 3. Map database record to API DTO strictly (no "as", no Date type)
  return {
    id: updated.id,
    shopping_mall_deposit_id: updated.shopping_mall_deposit_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_id: updated.shopping_mall_order_id ?? undefined,
    type: updated.type,
    amount: updated.amount,
    business_status: updated.business_status,
    reason: updated.reason ?? undefined,
    evidence_reference: updated.evidence_reference ?? undefined,
    reversed_at:
      updated.reversed_at !== null && updated.reversed_at !== undefined
        ? toISOStringSafe(updated.reversed_at)
        : updated.reversed_at,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
