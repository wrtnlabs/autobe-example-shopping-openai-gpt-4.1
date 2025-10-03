import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Pagination logic
  const page = props.body.page !== undefined ? Number(props.body.page) : 1;
  const limit = props.body.limit !== undefined ? Number(props.body.limit) : 20;
  const skip = (page - 1) * limit;

  // Sort logic
  const allowedSortFields = [
    "created_at",
    "price",
    "stock_quantity",
    "sku_code",
  ];
  const sortField =
    props.body.sort && allowedSortFields.includes(props.body.sort)
      ? props.body.sort
      : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  // Filter - build price, stock, created_at conditions
  const priceFilter =
    props.body.priceMin !== undefined || props.body.priceMax !== undefined
      ? {
          ...(props.body.priceMin !== undefined && {
            gte: props.body.priceMin,
          }),
          ...(props.body.priceMax !== undefined && {
            lte: props.body.priceMax,
          }),
        }
      : undefined;

  const stockQuantityFilter =
    props.body.stockMin !== undefined || props.body.stockMax !== undefined
      ? {
          ...(props.body.stockMin !== undefined && {
            gte: props.body.stockMin,
          }),
          ...(props.body.stockMax !== undefined && {
            lte: props.body.stockMax,
          }),
        }
      : undefined;

  const createdAtFilter =
    props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
      ? {
          ...(props.body.createdAfter !== undefined && {
            gte: props.body.createdAfter,
          }),
          ...(props.body.createdBefore !== undefined && {
            lte: props.body.createdBefore,
          }),
        }
      : undefined;

  // Where clause
  const where = {
    shopping_mall_product_id: props.productId,
    ...(props.body.sku_code !== undefined && {
      sku_code: { contains: props.body.sku_code },
    }),
    ...(priceFilter !== undefined && { price: priceFilter }),
    ...(stockQuantityFilter !== undefined && {
      stock_quantity: stockQuantityFilter,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(props.body.deleted === true ? {} : { deleted_at: null }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        bar_code: true,
        option_values_hash: true,
        price: true,
        stock_quantity: true,
        weight: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_variants.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      sku_code: row.sku_code,
      bar_code:
        row.bar_code !== undefined && row.bar_code !== null
          ? row.bar_code
          : null,
      option_values_hash: row.option_values_hash,
      price: row.price,
      stock_quantity: row.stock_quantity,
      weight: row.weight,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
