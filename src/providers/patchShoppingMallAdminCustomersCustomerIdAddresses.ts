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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomersCustomerIdAddresses(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress> {
  // 1. Confirm customer exists
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // 2. Setup pagination
  const defaultLimit = 20;
  const maxLimit = 100;
  const page = (props.body.page ?? 1) < 1 ? 1 : (props.body.page ?? 1);
  let limit = props.body.limit ?? defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  // 3. Build where clause
  const where: Record<string, unknown> = {
    customer_id: props.customerId,
    deleted_at: null,
    ...(props.body.region !== undefined ? { region: props.body.region } : {}),
    ...(props.body.postal_code !== undefined
      ? { postal_code: props.body.postal_code }
      : {}),
    ...(props.body.is_default !== undefined
      ? { is_default: props.body.is_default }
      : {}),
  };

  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim().length > 0
  ) {
    const search = props.body.search;
    where.OR = [
      { recipient_name: { contains: search } },
      { phone: { contains: search } },
      { region: { contains: search } },
      { address_line1: { contains: search } },
      { address_line2: { contains: search } },
      { postal_code: { contains: search } },
    ];
  }

  // 4. Sorting
  let sortField = "created_at";
  if (props.body.sort_by === "updated_at") sortField = "updated_at";
  const sortOrder = props.body.order === "asc" ? "asc" : "desc";

  // 5. Query with pagination
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_customer_addresses.count({ where }),
  ]);

  const data = records.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    recipient_name: row.recipient_name,
    phone: row.phone,
    region: row.region,
    postal_code: row.postal_code,
    address_line1: row.address_line1,
    address_line2: row.address_line2 ?? undefined,
    is_default: row.is_default,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
