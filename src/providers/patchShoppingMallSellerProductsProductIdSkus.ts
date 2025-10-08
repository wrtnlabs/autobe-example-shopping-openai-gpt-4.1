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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku> {
  const { seller, productId, body } = props;

  // 1. Ownership check: Ensure product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Unauthorized: Product does not exist or not owned by seller",
      403,
    );
  }

  // 2. Setup filtering, pagination, and sorting
  const page = body.page !== undefined ? body.page : 0;
  const limit = body.limit !== undefined ? body.limit : 20;

  // 3. Build where clause
  let where: Record<string, any> = {
    shopping_mall_product_id: productId,
    deleted_at: null,
  };
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }
  if (body.sku_code !== undefined && body.sku_code !== null) {
    where.sku_code = body.sku_code;
  }
  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }
  if (body.price_min !== undefined && body.price_max !== undefined) {
    where.price = { gte: body.price_min, lte: body.price_max };
  } else if (body.price_min !== undefined) {
    where.price = { gte: body.price_min };
  } else if (body.price_max !== undefined) {
    where.price = { lte: body.price_max };
  }
  if (body.created_at_from !== undefined || body.created_at_to !== undefined) {
    where.created_at = {};
    if (body.created_at_from !== undefined)
      where.created_at.gte = body.created_at_from;
    if (body.created_at_to !== undefined)
      where.created_at.lte = body.created_at_to;
  }
  if (body.updated_at_from !== undefined || body.updated_at_to !== undefined) {
    where.updated_at = {};
    if (body.updated_at_from !== undefined)
      where.updated_at.gte = body.updated_at_from;
    if (body.updated_at_to !== undefined)
      where.updated_at.lte = body.updated_at_to;
  }

  // 4. Build sort
  const allowedSortFields = [
    "name",
    "price",
    "status",
    "created_at",
    "updated_at",
  ];
  const sort_by =
    allowedSortFields.indexOf((body.sort_by as string) ?? "") >= 0
      ? body.sort_by
      : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query SKUs and count in parallel
  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      orderBy: { [sort_by!]: sort_order },
      skip: Number(page) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
  ]);

  // 6. Map DB results to DTO array
  const data = skus.map((sku) => ({
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    name: sku.name,
    price: sku.price,
    status: sku.status,
    low_stock_threshold:
      sku.low_stock_threshold !== null ? sku.low_stock_threshold : undefined,
    main_image_url:
      sku.main_image_url !== null ? sku.main_image_url : undefined,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at:
      sku.deleted_at !== null ? toISOStringSafe(sku.deleted_at) : undefined,
  }));

  const pages = total > 0 ? Math.ceil(total / Number(limit)) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
