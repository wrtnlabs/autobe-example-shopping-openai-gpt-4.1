import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Test deletion of a product bundle by an administrator, validating authority
 * over any bundle regardless of product/seller.
 *
 * Scenario Steps:
 *
 * 1. Create a master product (bundle group) as admin.
 * 2. Create a component product as admin, which will be included in the bundle.
 * 3. Create a bundle associating the master product with the component product.
 * 4. Optionally, create another bundle to ensure unrelated bundles are unaffected.
 * 5. Perform a DELETE on the bundle using the administrator API.
 * 6. Verify deletion by attempting to delete again and checking for error (e.g.,
 *    404).
 * 7. Optionally, verify unrelated bundles and master/component products remain.
 *
 * Validation:
 *
 * - Administrator can delete any bundle, regardless of which products are
 *   involved.
 * - Hard-deletion: bundle is permanently removed (cannot be found afterward).
 * - Deletion does not cascade to products or other bundles (integrity
 *   maintained).
 */
export async function test_api_aimall_backend_administrator_products_productBundles_eraseByProductidAndProductbundleid(
  connection: api.IConnection,
) {
  // 1. Create master product
  const masterProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Bundle Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(masterProduct);

  // 2. Create component product
  const componentProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Component Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentProduct);

  // 3. Create bundle
  const productBundle =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
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
  typia.assert(productBundle);

  // 4. Optionally create unrelated bundle to verify isolation
  const unrelatedComponent =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Unrelated Component",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(unrelatedComponent);
  const unrelatedBundle =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: unrelatedComponent.id,
          is_required: false,
          quantity: 1,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(unrelatedBundle);

  // 5. Delete the target bundle by admin
  await api.functional.aimall_backend.administrator.products.productBundles.erase(
    connection,
    { productId: masterProduct.id, productBundleId: productBundle.id },
  );

  // 6. Verify deletion by attempting deletion again (should error, e.g., 404)
  await TestValidator.error("Should fail to delete already-deleted bundle")(
    async () => {
      await api.functional.aimall_backend.administrator.products.productBundles.erase(
        connection,
        { productId: masterProduct.id, productBundleId: productBundle.id },
      );
    },
  );

  // 7. Confirm unrelated bundle remains unaffected by attempting another valid delete (should succeed)
  await api.functional.aimall_backend.administrator.products.productBundles.erase(
    connection,
    { productId: masterProduct.id, productBundleId: unrelatedBundle.id },
  );
}
