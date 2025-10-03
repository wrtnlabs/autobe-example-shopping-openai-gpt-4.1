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

export async function putShoppingMallAdminMileagesMileageIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.IUpdate;
}): Promise<IShoppingMallMileageTransaction> {
  const { mileageId, transactionId, body } = props;

  // 1. Fetch the transaction and verify linkage
  const transaction =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findFirstOrThrow({
      where: {
        id: transactionId,
        shopping_mall_mileage_id: mileageId,
      },
    });

  // 2. Block update if business_status is finalized/immutable
  const lockedStatuses = ["confirmed", "expired", "reversed"];
  if (lockedStatuses.includes(transaction.business_status)) {
    throw new HttpException(
      `Cannot update transaction: status is already finalized (${transaction.business_status})`,
      400,
    );
  }

  // 3. (Snapshot/audit) Skipped: No snapshot table defined in schema for mileage transactions

  // 4. Update only allowed fields (patch semantics)
  const updated =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.update({
      where: { id: transactionId },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.business_status !== undefined && {
          business_status: body.business_status,
        }),
        ...(body.reason !== undefined && { reason: body.reason }),
        ...(body.evidence_reference !== undefined && {
          evidence_reference: body.evidence_reference,
        }),
        ...(body.reversed_at !== undefined && {
          reversed_at: body.reversed_at,
        }),
        ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 5. Return updated object in API type with full date conversions
  return {
    id: updated.id,
    shopping_mall_mileage_id: updated.shopping_mall_mileage_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_id:
      updated.shopping_mall_order_id !== undefined &&
      updated.shopping_mall_order_id !== null
        ? updated.shopping_mall_order_id
        : null,
    type: updated.type,
    amount: updated.amount,
    business_status: updated.business_status,
    reason: updated.reason ?? undefined,
    evidence_reference: updated.evidence_reference ?? undefined,
    reversed_at: updated.reversed_at
      ? toISOStringSafe(updated.reversed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
