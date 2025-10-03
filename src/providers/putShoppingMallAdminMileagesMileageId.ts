import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminMileagesMileageId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileage.IUpdate;
}): Promise<IShoppingMallMileage> {
  // Fetch only active (not-deleted) mileage account
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findFirst({
    where: {
      id: props.mileageId,
      deleted_at: null,
    },
  });
  if (!mileage) {
    throw new HttpException("Mileage account not found", 404);
  }

  // Validate requested balance, if requested
  if (props.body.balance !== undefined && props.body.balance < 0) {
    throw new HttpException("Balance cannot be negative", 400);
  }

  // Build and apply update - only set provided fields.
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_mileages.update({
    where: { id: props.mileageId },
    data: {
      // Update only fields provided in body, using undefined to skip.
      balance:
        props.body.balance !== undefined ? props.body.balance : undefined,
      status: props.body.status !== undefined ? props.body.status : undefined,
      expired_at:
        props.body.expired_at !== undefined
          ? props.body.expired_at === null
            ? null
            : props.body.expired_at
          : undefined,
      deleted_at:
        props.body.deleted_at !== undefined
          ? props.body.deleted_at === null
            ? null
            : props.body.deleted_at
          : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    balance: updated.balance,
    status: updated.status,
    expired_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
