import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalAccount";
import { IPageIShoppingMallExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallExternalAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCustomersCustomerIdExternalAccounts(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallExternalAccount.IRequest;
}): Promise<IPageIShoppingMallExternalAccount.ISummary> {
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: You are only permitted to view your own external accounts",
      403,
    );
  }

  const body = props.body ?? {};
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Validate allowed sort fields
  const ALLOWED_SORT_FIELDS = [
    "linked_at",
    "status",
    "provider",
    "created_at",
    "updated_at",
  ];
  const sortBy = ALLOWED_SORT_FIELDS.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "linked_at";
  const sortOrder: "asc" | "desc" =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Build Prisma where inline
  const where = {
    shopping_mall_customer_id: props.customerId,
    deleted_at: null,
    ...(body.provider !== undefined &&
      body.provider !== null && { provider: body.provider }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.external_user_id !== undefined &&
      body.external_user_id !== null && {
        external_user_id: body.external_user_id,
      }),
    ...(body.linked_at_start || body.linked_at_end
      ? {
          linked_at: {
            ...(body.linked_at_start && { gte: body.linked_at_start }),
            ...(body.linked_at_end && { lte: body.linked_at_end }),
          },
        }
      : {}),
  };

  const [accounts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_external_accounts.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        provider: true,
        status: true,
        linked_at: true,
        shopping_mall_customer_id: true,
        external_user_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_external_accounts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: accounts.map((x) => ({
      id: x.id,
      provider: x.provider,
      status: x.status,
      linked_at: toISOStringSafe(x.linked_at),
      shopping_mall_customer_id: x.shopping_mall_customer_id,
      external_user_id: x.external_user_id,
      created_at: toISOStringSafe(x.created_at),
      updated_at: toISOStringSafe(x.updated_at),
    })),
  };
}
