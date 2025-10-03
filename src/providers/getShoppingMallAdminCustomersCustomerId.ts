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

export async function getShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customerId,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  return {
    id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    email: customer.email,
    phone: customer.phone === null ? undefined : customer.phone,
    name: customer.name,
    status: customer.status,
    kyc_status: customer.kyc_status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };
}
