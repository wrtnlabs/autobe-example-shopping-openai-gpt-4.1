import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminMileagesMileageIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, mileageId, transactionId } = props;

  // Retrieve transaction only if not already deleted
  const txn =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findFirst({
      where: {
        id: transactionId,
        shopping_mall_mileage_id: mileageId,
        deleted_at: null,
      },
    });
  if (!txn) {
    throw new HttpException("Transaction not found or already deleted", 404);
  }
  if (
    txn.business_status === "confirmed" ||
    txn.business_status === "expired"
  ) {
    throw new HttpException(
      "Cannot delete finalized or expired transactions",
      400,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_mileage_transactions.update({
    where: { id: transactionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "mileage_transaction",
      entity_id: transactionId,
      event_type: "soft_delete",
      actor_id: admin.id,
      event_result: "success",
      event_time: now,
      created_at: now,
    },
  });
}
