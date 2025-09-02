import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing product bundle (SKU variant) for a given product.
 *
 * Allows an admin to update bundle attributes such as name, SKU code, price,
 * inventory policy, or activation status for a product's bundle. Validates that
 * any new SKU code is unique within active records. Ensures both bundle and
 * product linkage is correct and updates are timestamped.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload (authorization validated
 *   upstream)
 * @param props.productId - ID of parent product to which this bundle belongs
 * @param props.bundleId - ID of the unique bundle (SKU/variant) to update
 * @param props.body - Partial update object (bundle_name, sku_code, price,
 *   inventory_policy, is_active)
 * @returns The updated product bundle (SKU variant) object with all dates as
 *   strings
 * @throws {Error} When bundle is not found or already deleted
 * @throws {Error} When the new sku_code is already in use by another active
 *   bundle
 */
export async function put__shoppingMallAiBackend_admin_products_$productId_bundles_$bundleId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductBundle.IUpdate;
}): Promise<IShoppingMallAiBackendProductBundle> {
  const { productId, bundleId, body } = props;

  // Find the bundle by bundleId and productId, not soft deleted
  const bundle =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
      where: {
        id: bundleId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!bundle) throw new Error("Bundle not found");

  // Validate uniqueness of sku_code if updating
  if (body.sku_code !== undefined) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
        where: {
          sku_code: body.sku_code,
          id: { not: bundleId },
          deleted_at: null,
        },
      });
    if (existingSku) throw new Error("Duplicate sku_code");
  }

  // Update operation (only provided fields), update updated_at timestamp
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.update({
      where: { id: bundleId },
      data: {
        ...(body.bundle_name !== undefined && {
          bundle_name: body.bundle_name,
        }),
        ...(body.sku_code !== undefined && { sku_code: body.sku_code }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.inventory_policy !== undefined && {
          inventory_policy: body.inventory_policy,
        }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    bundle_name: updated.bundle_name,
    sku_code: updated.sku_code,
    price: updated.price,
    inventory_policy: updated.inventory_policy,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
