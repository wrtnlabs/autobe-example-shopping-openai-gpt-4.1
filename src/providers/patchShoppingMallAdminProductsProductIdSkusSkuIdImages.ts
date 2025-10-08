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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdSkusSkuIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IRequest;
}): Promise<IPageIShoppingMallCatalogImage> {
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting logic
  const allowedSortFields = ["created_at", "display_order"];
  const sortBy =
    props.body.sortBy && allowedSortFields.includes(props.body.sortBy)
      ? props.body.sortBy
      : "created_at";
  const sortDir =
    props.body.sortDir === "asc" || props.body.sortDir === "desc"
      ? props.body.sortDir
      : sortBy === "display_order"
        ? "asc"
        : "desc";

  // Build where condition
  const where = {
    shopping_mall_product_id: props.productId,
    shopping_mall_product_sku_id: props.skuId,
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          { alt_text: { contains: props.body.search } },
          { url: { contains: props.body.search } },
        ],
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_catalog_images.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_catalog_images.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((img) => ({
      id: img.id,
      shopping_mall_product_id: img.shopping_mall_product_id ?? undefined,
      shopping_mall_product_sku_id:
        img.shopping_mall_product_sku_id ?? undefined,
      url: img.url,
      alt_text: img.alt_text ?? undefined,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
    })),
  };
}
