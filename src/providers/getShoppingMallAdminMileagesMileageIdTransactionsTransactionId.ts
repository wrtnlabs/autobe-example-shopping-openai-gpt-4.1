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

export async function getShoppingMallAdminMileagesMileageIdTransactionsTransactionId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMileageTransaction> {
  const row =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findFirst({
      where: {
        id: props.transactionId,
        shopping_mall_mileage_id: props.mileageId,
      },
    });
  if (!row)
    throw new HttpException(
      "Transaction not found for provided mileageId and transactionId",
      404,
    );
  return {
    id: row.id,
    shopping_mall_mileage_id: row.shopping_mall_mileage_id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    shopping_mall_order_id: row.shopping_mall_order_id ?? null,
    type: row.type,
    amount: row.amount,
    business_status: row.business_status,
    reason: row.reason ?? null,
    evidence_reference: row.evidence_reference ?? null,
    reversed_at: row.reversed_at ? toISOStringSafe(row.reversed_at) : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}
