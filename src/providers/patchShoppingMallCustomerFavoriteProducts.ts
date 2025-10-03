import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { IPageIShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerFavoriteProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteProduct.IRequest;
}): Promise<IPageIShoppingMallFavoriteProduct> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause for Prisma
  const where: Record<string, any> = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.notification_enabled !== undefined && {
      notification_enabled: props.body.notification_enabled,
    }),
    ...(props.body.batch_label !== undefined &&
      props.body.batch_label !== null && {
        batch_label: { contains: props.body.batch_label },
      }),
  };
  // Handle created_at range queries (gte and lte)
  if (
    props.body.created_after !== undefined &&
    props.body.created_before !== undefined
  ) {
    where.created_at = {
      gt: props.body.created_after,
      lt: props.body.created_before,
    };
  } else if (props.body.created_after !== undefined) {
    where.created_at = { gt: props.body.created_after };
  } else if (props.body.created_before !== undefined) {
    where.created_at = { lt: props.body.created_before };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorite_products.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_favorite_products.count({ where }),
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
      shopping_mall_customer_id: row.shopping_mall_customer_id,
      shopping_mall_product_id: row.shopping_mall_product_id,
      shopping_mall_favorite_snapshot_id:
        row.shopping_mall_favorite_snapshot_id,
      notification_enabled: row.notification_enabled,
      batch_label: row.batch_label ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
