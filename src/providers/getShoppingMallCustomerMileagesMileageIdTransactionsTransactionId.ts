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

export async function getShoppingMallCustomerMileagesMileageIdTransactionsTransactionId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMileageTransaction> {
  const { customer, mileageId, transactionId } = props;
  const transaction =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findFirst({
      where: {
        id: transactionId,
        shopping_mall_mileage_id: mileageId,
      },
    });
  if (!transaction) {
    throw new HttpException("Transaction not found", 404);
  }
  if (transaction.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You can only access your own mileage transactions",
      403,
    );
  }
  return {
    id: transaction.id,
    shopping_mall_mileage_id: transaction.shopping_mall_mileage_id,
    shopping_mall_customer_id: transaction.shopping_mall_customer_id,
    shopping_mall_order_id: transaction.shopping_mall_order_id ?? null,
    type: transaction.type,
    amount: transaction.amount,
    business_status: transaction.business_status,
    reason: transaction.reason ?? null,
    evidence_reference: transaction.evidence_reference ?? null,
    reversed_at: transaction.reversed_at
      ? toISOStringSafe(transaction.reversed_at)
      : null,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: toISOStringSafe(transaction.updated_at),
    deleted_at: transaction.deleted_at
      ? toISOStringSafe(transaction.deleted_at)
      : null,
  };
}
