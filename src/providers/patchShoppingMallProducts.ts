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

  if (page < 1 || limit < 1) {
    throw new HttpException("Page and limit must be positive integers", 400);
  }
  if (limit > 100) {
    throw new HttpException("Limit must not exceed 100", 400);
  }

  const where = {
    deleted_at: null,
    ...(body.category_id !== undefined &&
      body.category_id !== null && {
        shopping_mall_category_id: body.category_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_seller_id: body.seller_id,
      }),
    ...(body.is_active !== undefined && {
      is_active: body.is_active,
    }),
    ...(body.search !== undefined &&
      body.search !== null && {
        name: {
          contains: body.search,
        },
      }),
  };

  let orderBy;
  switch (body.sort) {
    case "newest":
      orderBy = { created_at: "desc" as Prisma.SortOrder };
      break;
    case "price_asc":
    case "price_desc":
      orderBy = { created_at: "desc" as Prisma.SortOrder };
      break;
    case "rating":
    case "popularity":
    case "best":
    default:
      orderBy = { created_at: "desc" as Prisma.SortOrder };
      break;
  }

  const skip = (page - 1) * limit;
  if (skip >= 1000) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const maxTake = Math.min(limit, 1000 - skip);

  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      orderBy,
      skip,
      take: maxTake,
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    is_active: p.is_active,
    main_image_url: p.main_image_url === null ? undefined : p.main_image_url,
    shopping_mall_category_id: p.shopping_mall_category_id,
    shopping_mall_seller_id: p.shopping_mall_seller_id,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
    deleted_at:
      p.deleted_at === null || p.deleted_at === undefined
        ? undefined
        : toISOStringSafe(p.deleted_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
