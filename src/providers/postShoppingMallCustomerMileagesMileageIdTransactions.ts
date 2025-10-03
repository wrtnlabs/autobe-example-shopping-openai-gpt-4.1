import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerMileagesMileageIdTransactions(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.ICreate;
}): Promise<IShoppingMallMileageTransaction> {
  const { customer, mileageId, body } = props;

  // Supported transaction types
  const allowedTypes = [
    "accrual",
    "spend",
    "expiration",
    "bonus",
    "adjustment",
    "refund",
  ];
  if (!allowedTypes.includes(body.type)) {
    throw new HttpException("Invalid transaction type", 400);
  }
  if (body.amount < 0) {
    throw new HttpException("Amount must be non-negative", 400);
  }
  // Fetch the mileage account, check existence and ownership
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: mileageId, deleted_at: null },
  });
  if (!mileage) {
    throw new HttpException("Mileage account not found", 404);
  }
  if (mileage.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (mileage.status === "frozen") {
    throw new HttpException("Mileage account is frozen", 400);
  }
  // For accrual/bonus: require status active, prevent accrual on frozen
  if (
    (body.type === "accrual" || body.type === "bonus") &&
    mileage.status !== "active"
  ) {
    throw new HttpException("Cannot accrue/bonus on non-active account", 400);
  }
  // For spend: must have sufficient balance
  if (body.type === "spend" && mileage.balance < body.amount) {
    throw new HttpException("Insufficient mileage balance", 400);
  }
  // For expiration: allow zero-amount (idempotent), or only as much as available
  if (body.type === "expiration" && body.amount > mileage.balance) {
    throw new HttpException("Insufficient balance for expiration", 400);
  }
  // Compute post-transaction balance and update logic
  let nextBalance = mileage.balance;
  if (
    body.type === "accrual" ||
    body.type === "bonus" ||
    body.type === "adjustment" ||
    body.type === "refund"
  ) {
    nextBalance += body.amount;
  } else if (body.type === "spend" || body.type === "expiration") {
    nextBalance -= body.amount;
  }
  // Do all as a transaction
  const now = toISOStringSafe(new Date());
  let created:
    | Awaited<
        ReturnType<
          typeof MyGlobal.prisma.shopping_mall_mileage_transactions.create
        >
      >
    | undefined;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // update mileage account
    await tx.shopping_mall_mileages.update({
      where: { id: mileageId },
      data: {
        balance: nextBalance,
        updated_at: now,
      },
    });
    // insert transaction
    created = await tx.shopping_mall_mileage_transactions.create({
      data: {
        id: v4(),
        shopping_mall_mileage_id: mileageId,
        shopping_mall_customer_id: customer.id,
        shopping_mall_order_id: body.shopping_mall_order_id ?? null,
        type: body.type,
        amount: body.amount,
        business_status: body.business_status,
        reason: body.reason ?? null,
        evidence_reference: body.evidence_reference ?? null,
        reversed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  if (!created) {
    throw new Error("Mileage transaction creation failed");
  }
  // Return the created transaction as DTO
  return {
    id: created!.id,
    shopping_mall_mileage_id: created!.shopping_mall_mileage_id,
    shopping_mall_customer_id: created!.shopping_mall_customer_id,
    shopping_mall_order_id: created!.shopping_mall_order_id ?? undefined,
    type: created!.type,
    amount: created!.amount,
    business_status: created!.business_status,
    reason: created!.reason ?? undefined,
    evidence_reference: created!.evidence_reference ?? undefined,
    reversed_at: created!.reversed_at
      ? toISOStringSafe(created!.reversed_at)
      : undefined,
    created_at: toISOStringSafe(created!.created_at),
    updated_at: toISOStringSafe(created!.updated_at),
    deleted_at: created!.deleted_at
      ? toISOStringSafe(created!.deleted_at)
      : undefined,
  };
}
