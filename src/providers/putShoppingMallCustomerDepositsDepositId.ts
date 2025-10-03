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

export async function putShoppingMallCustomerDepositsDepositId(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallDeposit.IUpdate;
}): Promise<IShoppingMallDeposit> {
  // Fetch deposit account (must exist, not soft-deleted)
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findFirst({
    where: {
      id: props.depositId,
      deleted_at: null,
    },
  });
  if (!deposit) {
    throw new HttpException("Deposit account not found", 404);
  }
  if (deposit.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not the account owner", 403);
  }
  if (props.body.balance !== undefined) {
    throw new HttpException("Balance update not allowed for customer", 403);
  }

  // Prepare update data (status and/or deleted_at, and always updated_at)
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.deleted_at !== undefined
      ? { deleted_at: props.body.deleted_at }
      : {}),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.shopping_mall_deposits.update({
    where: { id: props.depositId },
    data: updateData,
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    balance: updated.balance,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
