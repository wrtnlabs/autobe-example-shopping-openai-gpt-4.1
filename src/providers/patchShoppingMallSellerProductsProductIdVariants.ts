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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Validate product ownership for this seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }

  // Pagination
  const pageRaw = props.body.page;
  const limitRaw = props.body.limit;
  const page = typeof pageRaw === "number" ? pageRaw : 1;
  const limit = typeof limitRaw === "number" ? limitRaw : 20;
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSorts = ["created_at", "price", "stock_quantity"];
  const rawSortField = props.body.sort ?? "";
  let sortField: "created_at" | "price" | "stock_quantity" = "created_at";
  if (allowedSorts.includes(rawSortField)) {
    sortField = rawSortField as "created_at" | "price" | "stock_quantity";
  }
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  // Filtering
  const where: Record<string, any> = {
    shopping_mall_product_id: props.productId,
  };
  // Soft delete handling (unless body.deleted=true, exclude soft-deleted)
  if (!props.body.deleted) where.deleted_at = null;

  // Filtering: SKU code partial/fuzzy search
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== null &&
    props.body.sku_code !== ""
  ) {
    where.sku_code = { contains: props.body.sku_code };
  }
  // Filtering: price
  if (props.body.priceMin !== undefined && props.body.priceMax !== undefined) {
    where.price = { gte: props.body.priceMin, lte: props.body.priceMax };
  } else if (props.body.priceMin !== undefined) {
    where.price = { gte: props.body.priceMin };
  } else if (props.body.priceMax !== undefined) {
    where.price = { lte: props.body.priceMax };
  }
  // Filtering: stock_quantity
  if (props.body.stockMin !== undefined && props.body.stockMax !== undefined) {
    where.stock_quantity = {
      gte: props.body.stockMin,
      lte: props.body.stockMax,
    };
  } else if (props.body.stockMin !== undefined) {
    where.stock_quantity = { gte: props.body.stockMin };
  } else if (props.body.stockMax !== undefined) {
    where.stock_quantity = { lte: props.body.stockMax };
  }
  // Filtering: created_at
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdBefore !== undefined
  ) {
    where.created_at = {
      gte: props.body.createdAfter,
      lte: props.body.createdBefore,
    };
  } else if (props.body.createdAfter !== undefined) {
    where.created_at = { gte: props.body.createdAfter };
  } else if (props.body.createdBefore !== undefined) {
    where.created_at = { lte: props.body.createdBefore };
  }

  // Total count and paginated result in parallel
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variants.count({ where }),
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
  ]);

  // Map to ISummary structure, all fields strictly typed
  const data = records.map((row) => {
    const summary: IShoppingMallProductVariant.ISummary = {
      id: row.id,
      sku_code: row.sku_code,
      bar_code: row.bar_code == null ? null : row.bar_code,
      option_values_hash: row.option_values_hash,
      price: row.price,
      stock_quantity: row.stock_quantity,
      weight: row.weight,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    return summary;
  });
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
