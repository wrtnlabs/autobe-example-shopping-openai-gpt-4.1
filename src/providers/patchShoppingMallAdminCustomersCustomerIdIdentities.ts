import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerIdentity";
import { IPageIShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerIdentity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomersCustomerIdIdentities(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerIdentity.IRequest;
}): Promise<IPageIShoppingMallCustomerIdentity.ISummary> {
  // 1. Ensure customer exists and not deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  if (!customer) throw new HttpException("Customer not found", 404);

  // 2. Pagination safe defaults
  const page_raw = props.body.page ?? 1;
  const limit_raw = props.body.limit ?? 20;
  const page = Number(page_raw) < 1 ? 1 : Number(page_raw);
  const limit = Number(limit_raw) < 1 ? 1 : Number(limit_raw);
  const skip = (page - 1) * limit;

  // 3. Build 'where' clause
  const where = {
    shopping_mall_customer_id: props.customerId,
    deleted_at: null,
    ...(props.body.identity_type
      ? { identity_type: props.body.identity_type }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.issuer ? { issuer: props.body.issuer } : {}),
    ...(props.body.verified_at_start || props.body.verified_at_end
      ? {
          verified_at: {
            ...(props.body.verified_at_start
              ? { gte: props.body.verified_at_start }
              : {}),
            ...(props.body.verified_at_end
              ? { lte: props.body.verified_at_end }
              : {}),
          },
        }
      : {}),
  };

  // 4. Run queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_identities.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        identity_type: true,
        status: true,
        issuer: true,
        issue_date: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_identities.count({ where }),
  ]);

  // 5. Map results to summary (safe mapping, all date fields via toISOStringSafe or null/undefined)
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    identity_type: row.identity_type,
    status: row.status,
    issuer: row.issuer ?? undefined,
    issue_date: row.issue_date ? toISOStringSafe(row.issue_date) : undefined,
    verified_at: row.verified_at ? toISOStringSafe(row.verified_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 6. Structure pagination
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
