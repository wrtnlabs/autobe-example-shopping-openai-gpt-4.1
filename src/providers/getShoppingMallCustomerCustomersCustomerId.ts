import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  // Authorization: Only profile owner can access
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: Only account owner may access this profile.",
      403,
    );
  }

  // Retrieve the customer account (only non-deleted accounts allowed)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId, deleted_at: null },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      status: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Customer account does not exist.", 404);
  }

  return {
    id: customer.id,
    email: customer.email,
    full_name: customer.full_name,
    phone: customer.phone,
    status: customer.status,
    email_verified: customer.email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
  };
}
