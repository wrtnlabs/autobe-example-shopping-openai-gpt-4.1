import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminMileagesMileageIdTransactions(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.ICreate;
}): Promise<IShoppingMallMileageTransaction> {
  const now = toISOStringSafe(new Date());
  // 1. Fetch the mileage account and check validity
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
  });
  if (!mileage) {
    throw new HttpException("Mileage account not found", 404);
  }
  if (mileage.deleted_at !== null) {
    throw new HttpException("Mileage account is deleted", 400);
  }
  if (mileage.status !== "active") {
    throw new HttpException("Mileage account is not active", 400);
  }
  if (
    typeof mileage.expired_at === "string" &&
    mileage.expired_at !== null &&
    (mileage.expired_at satisfies string as string) <= now
  ) {
    throw new HttpException("Mileage account is expired", 400);
  }
  // Calculate balance delta (positive: accrual/bonus, negative: spend/expiration/adjustment/refund)
  const type = props.body.type;
  const amount = props.body.amount;
  if (amount < 0) {
    throw new HttpException("Amount must be positive", 400);
  }
  let delta = 0;
  if (
    type === "spend" ||
    type === "expiration" ||
    type === "adjustment" ||
    type === "refund"
  ) {
    delta = -amount;
  } else {
    delta = amount;
  }
  if (delta < 0 && mileage.balance + delta < 0) {
    throw new HttpException("Insufficient mileage balance", 400);
  }
  const created =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.create({
      data: {
        id: v4(),
        shopping_mall_mileage_id: props.mileageId,
        shopping_mall_customer_id: mileage.shopping_mall_customer_id,
        shopping_mall_order_id: props.body.shopping_mall_order_id ?? undefined,
        type: type,
        amount: amount,
        business_status: props.body.business_status,
        reason: props.body.reason ?? undefined,
        evidence_reference: props.body.evidence_reference ?? undefined,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        shopping_mall_mileage_id: true,
        shopping_mall_customer_id: true,
        shopping_mall_order_id: true,
        type: true,
        amount: true,
        business_status: true,
        reason: true,
        evidence_reference: true,
        reversed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  await MyGlobal.prisma.shopping_mall_mileages.update({
    where: { id: props.mileageId },
    data: {
      balance: mileage.balance + delta,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    shopping_mall_mileage_id: created.shopping_mall_mileage_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_order_id: created.shopping_mall_order_id ?? undefined,
    type: created.type,
    amount: created.amount,
    business_status: created.business_status,
    reason: created.reason ?? undefined,
    evidence_reference: created.evidence_reference ?? undefined,
    reversed_at:
      created.reversed_at !== null && created.reversed_at !== undefined
        ? toISOStringSafe(created.reversed_at)
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
