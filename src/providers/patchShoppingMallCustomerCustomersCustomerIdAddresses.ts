import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCustomersCustomerIdAddresses(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress> {
  const { customer, customerId, body } = props;
  // 1. Auth check
  if (customerId !== customer.id) {
    throw new HttpException(
      "Forbidden: Customers can only view their own addresses.",
      403,
    );
  }

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // sort_by and order
  const sortField = body.sort_by ?? "created_at";
  const sortOrder = body.order ?? "desc";

  // Where clause
  const where = {
    customer_id: customerId,
    deleted_at: null,
    ...(body.region !== undefined ? { region: body.region } : {}),
    ...(body.postal_code !== undefined
      ? { postal_code: body.postal_code }
      : {}),
    ...(body.is_default !== undefined ? { is_default: body.is_default } : {}),
    ...(body.search && {
      OR: [
        { recipient_name: { contains: body.search } },
        { phone: { contains: body.search } },
        { region: { contains: body.search } },
        { address_line1: { contains: body.search } },
        { address_line2: { contains: body.search } },
      ],
    }),
  };

  // Order by
  const orderBy = { [sortField]: sortOrder };

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_customer_addresses.count({ where }),
  ]);

  // Map rows to API result
  const data = rows.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    recipient_name: row.recipient_name,
    phone: row.phone,
    region: row.region,
    postal_code: row.postal_code,
    address_line1: row.address_line1,
    address_line2:
      row.address_line2 === null || row.address_line2 === undefined
        ? undefined
        : row.address_line2,
    is_default: row.is_default,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null || row.deleted_at === undefined
        ? undefined
        : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
