import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate administrator API for fetching a specific product bundle's detail.
 *
 * This test performs the following workflow as an administrator:
 *
 * 1. Create two products (a main product and a component product) in the catalog.
 * 2. Assign the component product to the main product as a bundle relationship.
 * 3. Retrieve the created bundle by its relationship ID, verifying that all
 *    returned fields match what was input (bundle/component references,
 *    is_required, quantity).
 * 4. Negative test: Attempt to retrieve a bundle with a non-existent bundle ID and
 *    expect an error.
 * 5. Negative test: Attempt to retrieve a bundle with a valid bundle ID but
 *    incorrect product ID and expect an error.
 */
export async function test_api_aimall_backend_test_admin_get_product_bundle_detail(
  connection: api.IConnection,
) {
  // 1. Create two products: main (bundle group) and component
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const mainProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(mainProduct);
  const componentProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentProduct);

  // 2. Assign component product as a bundle to main product
  const bundle =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          component_product_id: componentProduct.id,
          is_required: true,
          quantity: 3,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // 3. Retrieve the bundle detail via GET and validate
  const bundleDetail =
    await api.functional.aimall_backend.administrator.products.productBundles.at(
      connection,
      {
        productId: mainProduct.id,
        productBundleId: bundle.id,
      },
    );
  typia.assert(bundleDetail);
  TestValidator.equals("bundle id")(bundleDetail.id)(bundle.id);
  TestValidator.equals("bundle product reference")(
    bundleDetail.bundle_product_id,
  )(mainProduct.id);
  TestValidator.equals("component reference")(
    bundleDetail.component_product_id,
  )(componentProduct.id);
  TestValidator.equals("is_required")(bundleDetail.is_required)(true);
  TestValidator.equals("quantity")(bundleDetail.quantity)(3);

  // 4. Negative case: bundleId does not exist
  await TestValidator.error("not found: invalid bundle id")(async () =>
    api.functional.aimall_backend.administrator.products.productBundles.at(
      connection,
      {
        productId: mainProduct.id,
        productBundleId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );

  // 5. Negative case: correct bundle, wrong productId
  await TestValidator.error("not found: mismatched productId")(async () =>
    api.functional.aimall_backend.administrator.products.productBundles.at(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        productBundleId: bundle.id,
      },
    ),
  );
}
