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

export async function postShoppingMallAdminMileages(props: {
  admin: AdminPayload;
  body: IShoppingMallMileage.ICreate;
}): Promise<IShoppingMallMileage> {
  const existing = await MyGlobal.prisma.shopping_mall_mileages.findFirst({
    where: {
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "Mileage account already initialized for this customer.",
      409,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const expired_at: (string & tags.Format<"date-time">) | null =
    props.body.expired_at !== undefined && props.body.expired_at !== null
      ? toISOStringSafe(props.body.expired_at)
      : null;

  const mileage = await MyGlobal.prisma.shopping_mall_mileages.create({
    data: {
      id,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      balance: props.body.balance,
      status: props.body.status,
      expired_at,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: mileage.id,
    shopping_mall_customer_id: mileage.shopping_mall_customer_id,
    balance: mileage.balance,
    status: mileage.status,
    expired_at: mileage.expired_at ? toISOStringSafe(mileage.expired_at) : null,
    created_at: toISOStringSafe(mileage.created_at),
    updated_at: toISOStringSafe(mileage.updated_at),
    deleted_at: mileage.deleted_at ? toISOStringSafe(mileage.deleted_at) : null,
  };
}
