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

export async function patchShoppingMallAdminProductsProductIdSkusSkuIdInventory(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IPartialUpdate;
}): Promise<IShoppingMallInventoryRecord> {
  // Step 1: Check SKU exists & is for given productId
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: { id: true, shopping_mall_product_id: true },
  });
  if (!sku || sku.shopping_mall_product_id !== props.productId) {
    throw new HttpException("SKU not found for the specified product", 404);
  }

  // Step 2: Check inventory record exists for sku
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { shopping_mall_product_sku_id: props.skuId },
    });
  if (!inventory) {
    throw new HttpException("Inventory record not found for SKU", 404);
  }

  // Step 3: Validate & construct update fields, at least one must be set
  const fieldsPresent =
    props.body.quantity_available !== undefined ||
    props.body.quantity_reserved !== undefined ||
    props.body.quantity_sold !== undefined ||
    props.body.low_stock_threshold !== undefined ||
    props.body.status !== undefined;
  if (!fieldsPresent) {
    throw new HttpException(
      "At least one field must be provided to update inventory",
      400,
    );
  }

  if (
    props.body.quantity_available !== undefined &&
    props.body.quantity_available < 0
  ) {
    throw new HttpException("quantity_available must be non-negative", 422);
  }
  if (
    props.body.quantity_reserved !== undefined &&
    props.body.quantity_reserved < 0
  ) {
    throw new HttpException("quantity_reserved must be non-negative", 422);
  }
  if (props.body.quantity_sold !== undefined && props.body.quantity_sold < 0) {
    throw new HttpException("quantity_sold must be non-negative", 422);
  }
  if (
    props.body.low_stock_threshold !== undefined &&
    props.body.low_stock_threshold !== null &&
    props.body.low_stock_threshold < 0
  ) {
    throw new HttpException(
      "low_stock_threshold must be non-negative or null",
      422,
    );
  }

  // Step 4: Update inline, setting only present fields, plus updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inventory_records.update({
    where: { shopping_mall_product_sku_id: props.skuId },
    data: {
      ...(props.body.quantity_available !== undefined
        ? { quantity_available: props.body.quantity_available }
        : {}),
      ...(props.body.quantity_reserved !== undefined
        ? { quantity_reserved: props.body.quantity_reserved }
        : {}),
      ...(props.body.quantity_sold !== undefined
        ? { quantity_sold: props.body.quantity_sold }
        : {}),
      ...(props.body.low_stock_threshold !== undefined
        ? { low_stock_threshold: props.body.low_stock_threshold }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      updated_at: now,
    },
  });

  // Step 5: Return strict DTO, never use Date or as
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity_available: updated.quantity_available,
    quantity_reserved: updated.quantity_reserved,
    quantity_sold: updated.quantity_sold,
    low_stock_threshold: updated.low_stock_threshold,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
