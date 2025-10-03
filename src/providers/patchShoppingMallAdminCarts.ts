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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCarts(props: {
  admin: AdminPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  // Input destructure with defaults for pagination
  const body = props.body ?? {};
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only allow max 100, min 1
  const cleanPage = page < 1 ? 1 : page;
  const cleanLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;

  // Dynamic WHERE clause for filters. Exclude deleted carts.
  const where = {
    deleted_at: null,
    ...(body.customerId !== undefined &&
      body.customerId !== null && {
        shopping_mall_customer_id: body.customerId,
      }),
    ...(body.shopping_mall_channel_id !== undefined &&
      body.shopping_mall_channel_id !== null && {
        shopping_mall_channel_id: body.shopping_mall_channel_id,
      }),
    ...(body.shopping_mall_section_id !== undefined &&
      body.shopping_mall_section_id !== null && {
        shopping_mall_section_id: body.shopping_mall_section_id,
      }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.source !== undefined && { source: body.source }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.expires_from !== undefined || body.expires_to !== undefined
      ? {
          expires_at: {
            ...(body.expires_from !== undefined && { gte: body.expires_from }),
            ...(body.expires_to !== undefined && { lte: body.expires_to }),
          },
        }
      : {}),
  };

  // Sorting
  const sortField =
    body.sort === "updated_at" || body.sort === "expires_at"
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Query (findMany/count parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_carts.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (cleanPage - 1) * cleanLimit,
      take: cleanLimit,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_channel_id: true,
        shopping_mall_section_id: true,
        source: true,
        status: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_carts.count({ where }),
  ]);

  // Map DB rows to ISummary[]
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_customer_id: row.shopping_mall_customer_id,
    shopping_mall_channel_id: row.shopping_mall_channel_id,
    shopping_mall_section_id: row.shopping_mall_section_id,
    source: row.source,
    status: row.status,
    expires_at:
      row.expires_at != null ? toISOStringSafe(row.expires_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(cleanPage),
      limit: Number(cleanLimit),
      records: total,
      pages: Math.ceil(total / cleanLimit),
    },
    data,
  };
}
