import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdSkus(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku> {
  const { admin, productId, body } = props;

  // 1. Confirm product exists (else 404)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId, deleted_at: null },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // 2. Pagination params (default page 1, limit 20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where conditions
  const where = Object.assign(
    {},
    { shopping_mall_product_id: productId, deleted_at: null },
    body.name !== undefined ? { name: { contains: body.name } } : {},
    body.sku_code !== undefined
      ? { sku_code: { contains: body.sku_code } }
      : {},
    body.status !== undefined ? { status: body.status } : {},
    body.price_min !== undefined || body.price_max !== undefined
      ? {
          price: Object.assign(
            {},
            body.price_min !== undefined ? { gte: body.price_min } : {},
            body.price_max !== undefined ? { lte: body.price_max } : {},
          ),
        }
      : {},
    body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: Object.assign(
            {},
            body.created_at_from !== undefined
              ? { gte: body.created_at_from }
              : {},
            body.created_at_to !== undefined ? { lte: body.created_at_to } : {},
          ),
        }
      : {},
    body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: Object.assign(
            {},
            body.updated_at_from !== undefined
              ? { gte: body.updated_at_from }
              : {},
            body.updated_at_to !== undefined ? { lte: body.updated_at_to } : {},
          ),
        }
      : {},
  );

  // 4. Sorting
  const allowedSortFields = [
    "name",
    "price",
    "status",
    "created_at",
    "updated_at",
  ];
  const sortField =
    body.sort_by && allowedSortFields.indexOf(body.sort_by) >= 0
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // 5. Fetch data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
  ]);

  // 6. Map rows to IShoppingMallProductSku
  const data = rows.map((sku) => ({
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    name: sku.name,
    price: sku.price,
    status: sku.status,
    low_stock_threshold: sku.low_stock_threshold ?? undefined,
    main_image_url: sku.main_image_url ?? undefined,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
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
