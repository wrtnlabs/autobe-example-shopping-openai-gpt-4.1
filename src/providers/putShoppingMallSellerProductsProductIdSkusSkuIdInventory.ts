import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdSkusSkuIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IUpdate;
}): Promise<IShoppingMallInventoryRecord> {
  // 1. Get SKU and check product/seller ownership
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found for product", 404);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Forbidden: Only SKU owner may replace inventory",
      403,
    );
  }
  // 2. Find inventory record for SKU
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirst({
      where: { shopping_mall_product_sku_id: props.skuId },
    });
  if (!inventory) {
    throw new HttpException("Inventory record not found for SKU", 404);
  }
  // 3. Update inventory record (full PUT)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inventory_records.update({
    where: { id: inventory.id },
    data: {
      quantity_available: props.body.quantity_available,
      quantity_reserved: props.body.quantity_reserved,
      quantity_sold: props.body.quantity_sold,
      low_stock_threshold:
        props.body.low_stock_threshold !== undefined
          ? props.body.low_stock_threshold
          : null,
      status: props.body.status,
      updated_at: now,
    },
  });
  // 4. Return full DTO (all required/optional fields match schema/interface)
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity_available: updated.quantity_available,
    quantity_reserved: updated.quantity_reserved,
    quantity_sold: updated.quantity_sold,
    low_stock_threshold: updated.low_stock_threshold ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
