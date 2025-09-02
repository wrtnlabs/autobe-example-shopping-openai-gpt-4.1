import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detailed information for a specific product bundle (SKU/variant) of a
 * product.
 *
 * Retrieves detailed information for a specific product bundle (SKU variant) by
 * its unique identifier for the given product. This operation fetches all
 * business attributes associated with the bundle from the
 * shopping_mall_ai_backend_product_bundles table, including pricing, option
 * groupings, SKU code, status, and inventory policy. The operation enables
 * management and review of variant-specific details for catalog maintenance and
 * sales tracking.
 *
 * Authorization: Must be called by an authenticated seller (SellerPayload). The
 * returned bundle must belong to the given product and not be soft-deleted.
 *
 * @param props - Operation parameters
 * @param props.seller - Authenticated seller (ID, role)
 * @param props.productId - ID of the product to which the bundle must belong
 * @param props.bundleId - ID of the bundle (SKU/variant) to retrieve
 * @returns Complete business details for the referenced product bundle
 *   (SKU/variant)
 * @throws {Error} If the bundle does not exist, does not belong to the given
 *   product, or is soft-deleted
 */
export async function get__shoppingMallAiBackend_seller_products_$productId_bundles_$bundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductBundle> {
  const { seller, productId, bundleId } = props;

  const bundle =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirstOrThrow(
      {
        where: {
          id: bundleId,
          shopping_mall_ai_backend_products_id: productId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_products_id: true,
          bundle_name: true,
          sku_code: true,
          price: true,
          inventory_policy: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

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
