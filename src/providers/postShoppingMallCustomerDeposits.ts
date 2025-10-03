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

export async function postShoppingMallCustomerDeposits(props: {
  customer: CustomerPayload;
  body: IShoppingMallDeposit.ICreate;
}): Promise<IShoppingMallDeposit> {
  // Only allow users to create deposits for themselves
  if (props.customer.id !== props.body.shopping_mall_customer_id) {
    throw new HttpException(
      "Forbidden: Can only create a deposit for your own account",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_deposits.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.body.shopping_mall_customer_id,
        balance: props.body.balance,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    // Handle unique violation on shopping_mall_customer_id
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: Deposit account already exists for this customer.",
        409,
      );
    }
    // Bubble unexpected errors
    throw err;
  }

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    balance: created.balance,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
