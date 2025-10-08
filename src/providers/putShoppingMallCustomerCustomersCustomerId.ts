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

export async function putShoppingMallCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const { customer, customerId, body } = props;

  // Ownership verification
  if (customer.id !== customerId) {
    throw new HttpException(
      "Forbidden: Cannot update another customer's profile.",
      403,
    );
  }

  // Fetch current customer; reject if not found or soft-deleted
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: customerId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found or account withdrawn", 404);
  }

  // Immutable date value for updated_at
  const now = toISOStringSafe(new Date());

  // Only update allowed fields; skip any not present in body
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customerId },
    data: {
      full_name: body.full_name ?? undefined,
      phone: body.phone ?? undefined,
      status: body.status ?? undefined,
      email_verified: body.email_verified ?? undefined,
      updated_at: now,
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
    updated_at: now, // set as 'now' for returned value
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
