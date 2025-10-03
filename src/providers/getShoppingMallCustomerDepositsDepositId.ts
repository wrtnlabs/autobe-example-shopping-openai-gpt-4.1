import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerDepositsDepositId(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDeposit> {
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findUnique({
    where: { id: props.depositId },
  });
  if (!deposit) {
    throw new HttpException("Deposit account not found", 404);
  }
  if (deposit.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Access denied to deposit account", 403);
  }
  return {
    id: deposit.id,
    shopping_mall_customer_id: deposit.shopping_mall_customer_id,
    balance: deposit.balance,
    status: deposit.status,
    created_at: toISOStringSafe(deposit.created_at),
    updated_at: toISOStringSafe(deposit.updated_at),
    deleted_at:
      deposit.deleted_at !== null && deposit.deleted_at !== undefined
        ? toISOStringSafe(deposit.deleted_at)
        : undefined,
  };
}
