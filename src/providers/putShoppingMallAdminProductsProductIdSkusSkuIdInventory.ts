import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdSkusSkuIdInventory(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IUpdate;
}): Promise<IShoppingMallInventoryRecord> {
  // 1. Ensure SKU exists and belongs to the product
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
  });
  if (!sku || sku.shopping_mall_product_id !== props.productId) {
    throw new HttpException("SKU not found for this product", 404);
  }

  // 2. Ensure inventory record exists for this SKU
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { shopping_mall_product_sku_id: props.skuId },
    });
  if (!inventory) {
    throw new HttpException("Inventory record not found for this SKU", 404);
  }

  // 3. Validate non-negative values
  if (props.body.quantity_available < 0) {
    throw new HttpException("quantity_available cannot be negative", 400);
  }
  if (props.body.quantity_reserved < 0) {
    throw new HttpException("quantity_reserved cannot be negative", 400);
  }
  if (props.body.quantity_sold < 0) {
    throw new HttpException("quantity_sold cannot be negative", 400);
  }
  if (
    props.body.low_stock_threshold !== undefined &&
    props.body.low_stock_threshold !== null &&
    props.body.low_stock_threshold < 0
  ) {
    throw new HttpException("low_stock_threshold cannot be negative", 400);
  }

  // 4. Update inventory record (atomic replace, current updated_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inventory_records.update({
    where: { shopping_mall_product_sku_id: props.skuId },
    data: {
      quantity_available: props.body.quantity_available,
      quantity_reserved: props.body.quantity_reserved,
      quantity_sold: props.body.quantity_sold,
      low_stock_threshold:
        props.body.low_stock_threshold === undefined
          ? null
          : props.body.low_stock_threshold,
      status: props.body.status,
      updated_at: now,
    },
  });

  // 5. Compose and return full DTO
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity_available: updated.quantity_available,
    quantity_reserved: updated.quantity_reserved,
    quantity_sold: updated.quantity_sold,
    low_stock_threshold:
      updated.low_stock_threshold !== null ? updated.low_stock_threshold : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
