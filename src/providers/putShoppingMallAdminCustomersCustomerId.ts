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
  // 1. Fetch the customer (must exist, not deleted)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  if (!customer) throw new HttpException("Customer not found.", 404);

  // 2. Only update provided fields, always update updated_at
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      ...(props.body.full_name !== undefined && {
        full_name: props.body.full_name,
      }),
      ...(props.body.phone !== undefined && { phone: props.body.phone }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.email_verified !== undefined && {
        email_verified: props.body.email_verified,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Fetch updated customer for return
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
      where: {
        id: props.customerId,
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    phone: updated.phone,
    status: updated.status,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
