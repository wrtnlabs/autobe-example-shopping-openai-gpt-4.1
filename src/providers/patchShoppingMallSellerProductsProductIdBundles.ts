import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { IPageIShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBundle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdBundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.IRequest;
}): Promise<IPageIShoppingMallProductBundle> {
  // 1. Verify product exists, is not deleted, and is owned by seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      seller: {
        shopping_mall_customer_id: props.seller.id,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // 2. Pagination, sorting, filter setup
  const pageInput = props.body.page ?? 1;
  const limitInput = props.body.limit ?? 20;
  const page = pageInput < 1 ? 1 : pageInput;
  const limit = limitInput < 1 ? 20 : limitInput;
  const skip = (page - 1) * limit;
  // sort_field: only allow 'position', 'created_at', 'name'
  const allowedSortFields = ["position", "created_at", "name"];
  const sortField = allowedSortFields.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "position";
  const sortOrder = props.body.sort_order === "desc" ? "desc" : "asc";

  const where = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.bundle_type !== undefined &&
      props.body.bundle_type !== null && {
        bundle_type: props.body.bundle_type,
      }),
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
      ? {
          OR: [
            { name: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const [bundles, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_bundles.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_bundles.count({ where }),
  ]);

  const data = bundles.map((row) => ({
    id: row.id,
    shopping_mall_product_id: row.shopping_mall_product_id,
    name: row.name,
    bundle_type: row.bundle_type,
    description: row.description,
    position: row.position,
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
