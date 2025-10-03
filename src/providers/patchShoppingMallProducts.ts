import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && {
        shopping_mall_channel_id: body.channel_id,
      }),
    ...(body.section_id !== undefined &&
      body.section_id !== null && {
        shopping_mall_section_id: body.section_id,
      }),
    ...(body.category_id !== undefined &&
      body.category_id !== null && {
        shopping_mall_category_id: body.category_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_seller_id: body.seller_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.code !== undefined &&
      body.code !== null && {
        code: body.code,
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && {
                gte: body.updated_at_from,
              }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && {
                lte: body.updated_at_to,
              }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { name: { contains: body.search } },
          { code: { contains: body.search } },
        ],
      }),
  };

  const allowedSortFields = ["name", "created_at", "updated_at", "status"];
  const sortField =
    body.sort_by && allowedSortFields.indexOf(body.sort_by) !== -1
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_channel_id: true,
        code: true,
        name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_seller_id: row.shopping_mall_seller_id,
      shopping_mall_channel_id: row.shopping_mall_channel_id,
      code: row.code,
      name: row.name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
