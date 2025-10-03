import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCartsCartIdItems(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem> {
  // Validate cart existence (must not be soft-deleted)
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  // Pagination defaults
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    shopping_mall_cart_id: props.cartId,
    deleted_at: null,
    ...(props.body.shopping_mall_product_id !== undefined && {
      shopping_mall_product_id: props.body.shopping_mall_product_id,
    }),
    ...(props.body.shopping_mall_product_variant_id !== undefined && {
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        lte: props.body.created_at_to,
      },
    }),
  };
  // Sorting logic: only allow ordering on allowed fields
  const allowedSortFields = ["created_at", "quantity"];
  let orderBy;
  if (props.body.sort) {
    const [fieldRaw, orderRaw] = props.body.sort.trim().split(/\s+/);
    const field = allowedSortFields.includes(fieldRaw)
      ? fieldRaw
      : "created_at";
    const order =
      orderRaw && ["asc", "desc"].includes(orderRaw.toLowerCase())
        ? (orderRaw.toLowerCase() as Prisma.SortOrder)
        : ("desc" as Prisma.SortOrder);
    orderBy = { [field]: order };
  } else {
    orderBy = { created_at: "desc" as Prisma.SortOrder };
  }
  // Query rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where }),
  ]);
  // Map result rows to DTOs
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_cart_id: row.shopping_mall_cart_id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      row.shopping_mall_product_variant_id === null
        ? undefined
        : row.shopping_mall_product_variant_id,
    quantity: row.quantity,
    option_snapshot: row.option_snapshot,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));
  // Pagination info (must use satisfies pattern to match required branding)
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
