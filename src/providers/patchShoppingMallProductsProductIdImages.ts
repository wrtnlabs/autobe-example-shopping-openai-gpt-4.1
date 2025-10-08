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

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IRequest;
}): Promise<IPageIShoppingMallCatalogImage> {
  // 1. Check that the product exists and is public (is_active)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { is_active: true },
  });
  if (!product || !product.is_active)
    throw new HttpException("Product not found or not public", 404);

  // 2. Extract pagination parameters
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;

  // 3. Build where clause for images
  const where = {
    shopping_mall_product_id: props.productId,
    ...(props.body.skuId !== undefined &&
      props.body.skuId !== null && {
        shopping_mall_product_sku_id: props.body.skuId,
      }),
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
      ? {
          OR: [
            { alt_text: { contains: props.body.search } },
            { url: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  // 4. Order by (default: created_at desc, else display_order asc)
  let orderBy;
  if (props.body.sortBy === "display_order") {
    orderBy = {
      display_order: (props.body.sortDir === "desc"
        ? "desc"
        : "asc") as Prisma.SortOrder,
    };
  } else {
    orderBy = {
      created_at: (props.body.sortDir === "asc"
        ? "asc"
        : "desc") as Prisma.SortOrder,
    };
  }

  // 5. Execute queries (findMany for data, count for total)
  const [images, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_catalog_images.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_catalog_images.count({ where }),
  ]);

  // 6. Map images to IShoppingMallCatalogImage[]
  const data = images.map((img) => ({
    id: img.id,
    shopping_mall_product_id: img.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id: img.shopping_mall_product_sku_id ?? undefined,
    url: img.url,
    alt_text: img.alt_text ?? undefined,
    display_order: img.display_order,
    created_at: toISOStringSafe(img.created_at),
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
