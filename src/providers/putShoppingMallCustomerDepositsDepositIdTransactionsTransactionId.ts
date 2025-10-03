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

export async function putShoppingMallCustomerDepositsDepositIdTransactionsTransactionId(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.IUpdate;
}): Promise<IShoppingMallDepositTransaction> {
  const { customer, depositId, transactionId, body } = props;

  // 1. Fetch target transaction + ownership enforcement
  const transaction =
    await MyGlobal.prisma.shopping_mall_deposit_transactions.findFirst({
      where: {
        id: transactionId,
        shopping_mall_deposit_id: depositId,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!transaction) {
    throw new HttpException("Transaction not found or forbidden", 404);
  }

  // 2. Restrict updatable fields for customer; forbid 'reversed' status
  if (
    body.business_status !== undefined &&
    typeof body.business_status === "string" &&
    ["reversed", "admin_adjustment", "failed", "refund"].includes(
      body.business_status,
    )
  ) {
    throw new HttpException("Forbidden status transition", 403);
  }
  // NOTE: Only status, business_status, reason, evidence_reference, and reversed_at are supported
  const update: Record<string, unknown> = {};
  if (body.business_status !== undefined) {
    update.business_status = body.business_status;
  }
  if (body.status !== undefined) {
    update.status = body.status;
  }
  if (body.reason !== undefined) {
    update.reason = body.reason;
  }
  if (body.evidence_reference !== undefined) {
    update.evidence_reference = body.evidence_reference;
  }
  if (body.reversed_at !== undefined) {
    update.reversed_at = body.reversed_at ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new HttpException("No updatable fields provided", 400);
  }

  // 3. Update the transaction
  const updated =
    await MyGlobal.prisma.shopping_mall_deposit_transactions.update({
      where: { id: transactionId },
      data: update,
    });

  // 4. Map result to API type with explicit null/default handling for nullable fields
  return {
    id: updated.id,
    shopping_mall_deposit_id: updated.shopping_mall_deposit_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_id:
      typeof updated.shopping_mall_order_id === "string"
        ? updated.shopping_mall_order_id
        : updated.shopping_mall_order_id === null
          ? null
          : undefined,
    type: updated.type,
    amount: updated.amount,
    business_status: updated.business_status,
    reason:
      typeof updated.reason === "string"
        ? updated.reason
        : updated.reason === null
          ? null
          : undefined,
    evidence_reference:
      typeof updated.evidence_reference === "string"
        ? updated.evidence_reference
        : updated.evidence_reference === null
          ? null
          : undefined,
    reversed_at:
      updated.reversed_at !== null && updated.reversed_at !== undefined
        ? toISOStringSafe(updated.reversed_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
