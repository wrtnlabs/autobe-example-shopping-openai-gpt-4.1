import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information for a specific product bundle (SKU variant) by
 * its unique identifier for the given product.
 *
 * Fetches all business attributes from the
 * shopping_mall_ai_backend_product_bundles table, including pricing, SKU,
 * inventory policy, and activation status. Only available to active admins.
 *
 * @param props - Admin: AdminPayload for authentication (must be an active,
 *   enrolled admin; enforced by controller). productId: UUID of the parent
 *   product (required). bundleId: UUID of the bundle/variant to retrieve
 *   (required).
 * @returns IShoppingMallAiBackendProductBundle — complete business detail for
 *   the referenced bundle. All date/datetime values as string &
 *   tags.Format<'date-time'>.
 * @throws {Error} If bundle is not found for given product or is deleted.
 */
export async function get__shoppingMallAiBackend_admin_products_$productId_bundles_$bundleId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductBundle> {
  const bundle =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
      where: {
        id: props.bundleId,
        shopping_mall_ai_backend_products_id: props.productId,
        deleted_at: null,
      },
    });

  if (!bundle) {
    throw new Error("Product bundle not found or has been deleted.");
  }

  return {
    id: bundle.id,
    shopping_mall_ai_backend_products_id:
      bundle.shopping_mall_ai_backend_products_id,
    bundle_name: bundle.bundle_name,
    sku_code: bundle.sku_code,
    price: bundle.price,
    inventory_policy: bundle.inventory_policy,
    is_active: bundle.is_active,
    created_at: toISOStringSafe(bundle.created_at),
    updated_at: toISOStringSafe(bundle.updated_at),
    deleted_at: bundle.deleted_at ? toISOStringSafe(bundle.deleted_at) : null,
  };
}
