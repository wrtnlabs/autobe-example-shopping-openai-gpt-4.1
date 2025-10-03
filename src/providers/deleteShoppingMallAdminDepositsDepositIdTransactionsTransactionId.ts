import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminDepositsDepositIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find transaction to verify existence and not already soft-deleted
  const transaction =
    await MyGlobal.prisma.shopping_mall_deposit_transactions.findFirst({
      where: {
        id: props.transactionId,
        shopping_mall_deposit_id: props.depositId,
        deleted_at: null,
      },
    });
  if (!transaction) {
    throw new HttpException("Deposit transaction not found.", 404);
  }
  // Logical (soft) delete by setting deleted_at
  await MyGlobal.prisma.shopping_mall_deposit_transactions.update({
    where: { id: props.transactionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
