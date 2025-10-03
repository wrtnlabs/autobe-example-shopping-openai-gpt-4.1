import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerMileagesMileageId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileage.IUpdate;
}): Promise<IShoppingMallMileage> {
  // Fetch mileage account, ensure ownership and existence
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
  });
  if (!mileage || mileage.deleted_at != null) {
    throw new HttpException("Mileage account not found", 404);
  }
  if (mileage.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Only the account owner may update this mileage account.",
      403,
    );
  }
  // Validate status, default allowed values
  const allowedStatus = ["active", "expired", "frozen"];
  if (
    props.body.status !== undefined &&
    !allowedStatus.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  // Validate balance is non-negative
  if (props.body.balance !== undefined && props.body.balance < 0) {
    throw new HttpException("Mileage balance cannot be negative", 400);
  }
  // Compose update input, making no mutation
  const updated = await MyGlobal.prisma.shopping_mall_mileages.update({
    where: { id: props.mileageId },
    data: {
      balance:
        props.body.balance !== undefined ? props.body.balance : undefined,
      status: props.body.status !== undefined ? props.body.status : undefined,
      expired_at:
        props.body.expired_at !== undefined
          ? props.body.expired_at === null
            ? null
            : toISOStringSafe(props.body.expired_at)
          : undefined,
      deleted_at:
        props.body.deleted_at !== undefined
          ? props.body.deleted_at === null
            ? null
            : toISOStringSafe(props.body.deleted_at)
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return API-compliant object (string dates, all required fields)
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    balance: updated.balance,
    status: updated.status,
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
