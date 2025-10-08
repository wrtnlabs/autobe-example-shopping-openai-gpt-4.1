import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { IPageIShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductsProductIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IRequest;
}): Promise<IPageIShoppingMallProductOption> {
  // Extract pagination params (limit defaults to 20, page defaults to 1)
  const limit: number =
    props.body.limit != null ? Number(props.body.limit) : 20;
  const page: number = props.body.page != null ? Number(props.body.page) : 1;

  // Compute skip (offset)
  const skip = (page - 1) * limit;

  // Filtering
  const where = {
    shopping_mall_product_id: props.productId,
    ...(props.body.search != null &&
      props.body.search.length > 0 && {
        name: { contains: props.body.search },
      }),
    ...(props.body.display_order_from != null &&
      props.body.display_order_to != null && {
        display_order: {
          gte: Number(props.body.display_order_from),
          lte: Number(props.body.display_order_to),
        },
      }),
    ...(props.body.display_order_from != null &&
      props.body.display_order_to == null && {
        display_order: { gte: Number(props.body.display_order_from) },
      }),
    ...(props.body.display_order_from == null &&
      props.body.display_order_to != null && {
        display_order: { lte: Number(props.body.display_order_to) },
      }),
  };

  // Sorting: only allow explicit API-supported fields
  const validSortFields = [
    "name",
    "display_order",
    "created_at",
    "updated_at",
  ] as const;
  const validSortOrders = ["asc", "desc"] as const;
  const sortField = validSortFields.includes(props.body.sort as any)
    ? props.body.sort
    : "display_order";
  const sortOrder = validSortOrders.includes(props.body.order as any)
    ? props.body.order
    : "asc";

  // Query DB rows (fix: define orderBy inline, not with computed properties)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_options.findMany({
      where,
      orderBy:
        sortField === "name"
          ? { name: sortOrder }
          : sortField === "display_order"
            ? { display_order: sortOrder }
            : sortField === "created_at"
              ? { created_at: sortOrder }
              : { updated_at: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_options.count({ where }),
  ]);

  // Map rows to DTO
  const data = rows.map((opt) => ({
    id: opt.id,
    shopping_mall_product_id: opt.shopping_mall_product_id,
    name: opt.name,
    display_order: opt.display_order,
    created_at: toISOStringSafe(opt.created_at),
    updated_at: toISOStringSafe(opt.updated_at),
  }));

  // Build pagination result
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
