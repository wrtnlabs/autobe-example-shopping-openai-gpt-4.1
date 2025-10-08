import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import { IPageIShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdSkusSkuIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IRequest;
}): Promise<IPageIShoppingMallCatalogImage> {
  const { seller, productId, skuId, body } = props;

  // 1. Authorization: Ensure SKU belongs to the given product and seller
  const skuRecord = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: skuId,
      deleted_at: null,
      product: {
        id: productId,
        deleted_at: null,
        shopping_mall_seller_id: seller.id,
      },
    },
  });
  if (!skuRecord) {
    throw new HttpException("SKU not found or access denied.", 404);
  }

  // 2. Pagination/Sorting
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Where conditions (filter)
  const where: Record<string, unknown> = {
    deleted_at: null,
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: skuId,
  };
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { url: { contains: body.search } },
      { alt_text: { contains: body.search } },
    ];
  }

  // 4. Order by
  const orderBy =
    body.sortBy === "display_order"
      ? {
          display_order: (body.sortDir === "desc"
            ? "desc"
            : "asc") satisfies Prisma.SortOrder as Prisma.SortOrder,
        }
      : body.sortBy === "created_at"
        ? {
            created_at: (body.sortDir === "asc"
              ? "asc"
              : "desc") satisfies Prisma.SortOrder as Prisma.SortOrder,
          }
        : { created_at: "desc" satisfies Prisma.SortOrder as Prisma.SortOrder };

  // 5. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_catalog_images.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_catalog_images.count({ where }),
  ]);

  // 6. Map results
  const data = rows.map((img) => ({
    id: img.id,
    shopping_mall_product_id: img.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id: img.shopping_mall_product_sku_id ?? undefined,
    url: img.url,
    alt_text: img.alt_text ?? undefined,
    display_order: img.display_order,
    created_at: toISOStringSafe(img.created_at),
  }));

  // 7. Pagination structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
