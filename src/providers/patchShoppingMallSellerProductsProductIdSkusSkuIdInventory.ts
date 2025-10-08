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

export async function patchShoppingMallSellerProductsProductIdSkusSkuIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IPartialUpdate;
}): Promise<IShoppingMallInventoryRecord> {
  // Step 1: Fetch SKU, ensure productId match
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });
  if (!sku || sku.shopping_mall_product_id !== props.productId) {
    throw new HttpException("SKU or Product not found", 404);
  }

  // Step 2: Fetch product and check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: SKU does not belong to this seller",
      403,
    );
  }

  // Step 3: Fetch inventory record
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { shopping_mall_product_sku_id: props.skuId },
    });
  if (!inventory) {
    throw new HttpException("Inventory record not found", 404);
  }

  // Step 4: Validate fields
  const { body } = props;
  if (body.quantity_available !== undefined && body.quantity_available < 0) {
    throw new HttpException("quantity_available cannot be negative", 422);
  }
  if (body.quantity_reserved !== undefined && body.quantity_reserved < 0) {
    throw new HttpException("quantity_reserved cannot be negative", 422);
  }
  if (body.quantity_sold !== undefined && body.quantity_sold < 0) {
    throw new HttpException("quantity_sold cannot be negative", 422);
  }
  if (
    body.low_stock_threshold !== undefined &&
    body.low_stock_threshold !== null &&
    body.low_stock_threshold < 0
  ) {
    throw new HttpException("low_stock_threshold cannot be negative", 422);
  }
  if (
    body.status !== undefined &&
    (!body.status || typeof body.status !== "string")
  ) {
    throw new HttpException("status must be a non-empty string", 422);
  }
  if (
    body.quantity_available === undefined &&
    body.quantity_reserved === undefined &&
    body.quantity_sold === undefined &&
    body.low_stock_threshold === undefined &&
    body.status === undefined
  ) {
    throw new HttpException("No update fields provided", 422);
  }

  // Step 5: Update record
  const updated_at = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_inventory_records.update({
    where: { shopping_mall_product_sku_id: props.skuId },
    data: {
      ...(body.quantity_available !== undefined && {
        quantity_available: body.quantity_available,
      }),
      ...(body.quantity_reserved !== undefined && {
        quantity_reserved: body.quantity_reserved,
      }),
      ...(body.quantity_sold !== undefined && {
        quantity_sold: body.quantity_sold,
      }),
      ...(body.low_stock_threshold !== undefined && {
        low_stock_threshold: body.low_stock_threshold,
      }),
      ...(body.status !== undefined && { status: body.status }),
      updated_at,
    },
  });

  // Step 6: Return per API contract
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity_available: updated.quantity_available,
    quantity_reserved: updated.quantity_reserved,
    quantity_sold: updated.quantity_sold,
    low_stock_threshold:
      updated.low_stock_threshold === null ? null : updated.low_stock_threshold,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated_at,
  };
}
