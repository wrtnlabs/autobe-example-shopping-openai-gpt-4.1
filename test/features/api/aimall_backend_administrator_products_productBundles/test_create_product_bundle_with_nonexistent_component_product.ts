import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Test creation of a product bundle using a valid master (bundle group) product
 * but referencing a non-existent component product.
 *
 * Business context: In the AIMall backend, product bundles are composed by
 * assigning one or more existing products as components to a master (bundle)
 * product. Attempting to assign a non-existent product as a bundle component
 * should result in a validation failure, ensuring data integrity in the product
 * catalog.
 *
 * Test workflow:
 *
 * 1. Create a valid master (bundle) product using the administrator product
 *    creation API.
 * 2. Attempt to create a product bundle for that master, but set the
 *    component_product_id to a random UUID that does not exist in the product
 *    table.
 * 3. Verify that the API returns a validation error, preventing the creation of
 *    the bundle with non-existent component product.
 */
export async function test_api_aimall_backend_administrator_products_productBundles_test_create_product_bundle_with_nonexistent_component_product(
  connection: api.IConnection,
) {
  // 1. Create a valid master (bundle) product
  const masterProductInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test Bundle Master - Nonexistent Component",
    status: "active",
  };
  const masterProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: masterProductInput },
    );
  typia.assert(masterProduct);

  // 2. Attempt to create a product bundle referencing a non-existent component product
  const randomComponentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createBundleInput: IAimallBackendProductBundle.ICreate = {
    bundle_product_id: masterProduct.id,
    component_product_id: randomComponentId, // This UUID does not exist in products table
    is_required: true,
    quantity: 1,
  };

  // 3. Verify that creation attempt results in a validation error
  await TestValidator.error(
    "bundle creation with non-existent component should fail",
  )(() =>
    api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: createBundleInput,
      },
    ),
  );
}
