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

export async function getShoppingMallAdminMileagesMileageId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMileage> {
  const record = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
  });
  // Not found or soft-deleted
  if (!record || record.deleted_at) {
    throw new HttpException("Mileage account not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    balance: record.balance,
    status: record.status,
    expired_at: record.expired_at
      ? toISOStringSafe(record.expired_at)
      : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== undefined && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
