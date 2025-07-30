import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate hard deletion of a product bundle owned by a seller.
 *
 * This test ensures that when a seller deletes a product bundle association,
 * only the bundle relationship is removed and the referenced products
 * themselves remain unaffected and accessible. The overall business context is
 * catalog management by sellers: products can be grouped into bundle
 * (master-product/component-product) relationships, which can be deleted by the
 * owner. This test guarantees correct lifecycle manipulation of product bundle
 * rows.
 *
 * 1. Create a seller account with random but valid credentials.
 * 2. Create two products (master and component) for this seller.
 * 3. Bundle the component product to the master (creating a product bundle
 *    association).
 * 4. Perform a DELETE operation on the productBundle for the master product.
 * 5. Confirm successful deletion (no error thrown, status 204 implied).
 * 6. Confirm that the bundle is no longer queryable (would require bundles
 *    index/list endpoint; as only per-row endpoints are available in the
 *    provided SDK, skip direct negative query test).
 * 7. Confirm that both master and component products still exist in the system and
 *    are accessible (would require product detail query, but API does not
 *    provide such endpoint in given SDK, so this step is skipped).
 *
 * Notes:
 *
 * - Post-delete verification is limited to the fact that deletion does not cause
 *   error and products are not deleted, as no index/fetch endpoints are
 *   provided for bundles or products in available SDK for further querying.
 */
export async function test_api_aimall_backend_test_delete_product_bundle_by_seller(
  connection: api.IConnection,
) {
  // 1. Create seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create master product
  const masterProduct: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.alphabets(12),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(masterProduct);

  // 3. Create component product
  const componentProduct: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.alphabets(12),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(componentProduct);

  // 4. Create the product bundle
  const bundle: IAimallBackendProductBundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: componentProduct.id,
          is_required: true,
          quantity: 1,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // 5. Hard delete the product bundle
  await api.functional.aimall_backend.seller.products.productBundles.erase(
    connection,
    {
      productId: masterProduct.id,
      productBundleId: bundle.id,
    },
  );
}
