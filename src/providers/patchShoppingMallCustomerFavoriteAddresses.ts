import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";
import { IPageIShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerFavoriteAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteAddress.IRequest;
}): Promise<IPageIShoppingMallFavoriteAddress> {
  const { customer, body } = props;
  // Safe page/limit defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Build where conditions
  const where = {
    shopping_mall_customer_id: customer.id,
    deleted_at: null,
    ...(body.batch_label !== undefined
      ? body.batch_label === null
        ? { batch_label: null }
        : { batch_label: body.batch_label }
      : {}),
    ...(body.notification_enabled !== undefined &&
    body.notification_enabled !== null
      ? { notification_enabled: body.notification_enabled }
      : {}),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined && body.created_from !== null
              ? { gte: body.created_from }
              : {}),
            ...(body.created_to !== undefined && body.created_to !== null
              ? { lte: body.created_to }
              : {}),
          },
        }
      : {}),
  };
  // Determine orderBy
  let orderBy: any = { created_at: "desc" };
  if (body.sort) {
    const safeSorts = ["created_at", "batch_label"];
    const sortField = body.sort.replace(/^[-+]/, "");
    if (safeSorts.includes(sortField)) {
      const dir = body.sort.startsWith("-") ? "desc" : "asc";
      orderBy = { [sortField]: dir };
    }
  }
  // Query result & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorite_addresses.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_favorite_addresses.count({ where }),
  ]);
  // Map rows to DTO without type assertions or Date
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    shopping_mall_favorite_snapshot_id: row.shopping_mall_favorite_snapshot_id,
    shopping_mall_address_id: row.shopping_mall_address_id,
    notification_enabled: row.notification_enabled,
    batch_label:
      typeof row.batch_label === "string"
        ? row.batch_label
        : row.batch_label === null
          ? null
          : undefined,
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
