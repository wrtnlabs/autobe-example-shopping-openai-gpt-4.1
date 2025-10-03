import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // 1. Find customer and check soft-deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }

  // 2. Business rule: check duplicate email (if changing email)
  if (props.body.email && props.body.email !== customer.email) {
    const duplicate = await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        shopping_mall_channel_id: customer.shopping_mall_channel_id,
        email: props.body.email,
        deleted_at: null,
        NOT: { id: props.customerId },
      },
    });
    if (duplicate) {
      throw new HttpException("Email is already used in this channel", 409);
    }
  }

  // 3. Do the update (only allowed fields + updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      email: props.body.email ?? undefined,
      phone: props.body.phone ?? undefined,
      name: props.body.name ?? undefined,
      status: props.body.status ?? undefined,
      kyc_status: props.body.kyc_status ?? undefined,
      updated_at: now,
    },
  });

  // 4. Return API type (with all conversions)
  return {
    id: updated.id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    email: updated.email,
    phone: updated.phone === null ? undefined : updated.phone,
    name: updated.name,
    status: updated.status,
    kyc_status: updated.kyc_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
