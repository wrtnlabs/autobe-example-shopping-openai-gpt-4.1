import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerDepositsDepositId(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch deposit by id
  const deposit = await MyGlobal.prisma.shopping_mall_deposits.findUnique({
    where: { id: props.depositId },
  });
  if (!deposit) {
    throw new HttpException("Deposit account not found", 404);
  }
  // 2. Check not already deleted
  if (deposit.deleted_at !== null) {
    throw new HttpException("Deposit account already deleted", 400);
  }
  // 3. Check ownership
  if (deposit.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this deposit account",
      403,
    );
  }
  // 4. Soft-delete: set deleted_at
  await MyGlobal.prisma.shopping_mall_deposits.update({
    where: { id: props.depositId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
