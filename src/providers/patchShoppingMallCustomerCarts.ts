import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const {
    shopping_mall_channel_id,
    shopping_mall_section_id,
    status,
    source,
    created_from,
    created_to,
    expires_from,
    expires_to,
    sort,
    order,
    page,
    limit,
  } = props.body;

  // Compute allowed sort field
  const allowedSortFields = ["created_at", "updated_at", "expires_at"];
  const sortFieldName =
    typeof sort === "string" && allowedSortFields.includes(sort)
      ? sort
      : "created_at";
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Pagination defaults
  const currentPage = typeof page === "number" && page > 0 ? page : 1;
  const perPage =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (currentPage - 1) * perPage;

  // Build created_at filter
  const createdAtFilter =
    created_from !== undefined && created_to !== undefined
      ? { gte: created_from, lte: created_to }
      : created_from !== undefined
        ? { gte: created_from }
        : created_to !== undefined
          ? { lte: created_to }
          : undefined;
  // Build expires_at filter
  const expiresAtFilter =
    expires_from !== undefined && expires_to !== undefined
      ? { gte: expires_from, lte: expires_to }
      : expires_from !== undefined
        ? { gte: expires_from }
        : expires_to !== undefined
          ? { lte: expires_to }
          : undefined;

  // Always filter by the current customer's id and non-deleted carts
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(shopping_mall_channel_id !== undefined && { shopping_mall_channel_id }),
    ...(shopping_mall_section_id !== undefined && { shopping_mall_section_id }),
    ...(status !== undefined && { status }),
    ...(source !== undefined && { source }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(expiresAtFilter !== undefined && { expires_at: expiresAtFilter }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      orderBy: { [sortFieldName]: sortOrder },
      skip,
      take: perPage,
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  const data = rows.map((cart) => ({
    id: cart.id,
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    source: cart.source,
    status: cart.status,
    expires_at:
      cart.expires_at == null ? null : toISOStringSafe(cart.expires_at),
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
  }));

  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(perPage),
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data,
  };
}
