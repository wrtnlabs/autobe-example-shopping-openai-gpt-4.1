import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate fetching a product bundle's details as a seller.
 *
 * This test ensures that a seller can retrieve product bundle detail for their
 * own product, after properly setting up the bundle relationship. It also
 * asserts that attempting to fetch a bundle that does not exist (or is not
 * related to the given product) is properly denied by the API.
 *
 * Steps:
 *
 * 1. Create a main product as a seller
 * 2. Create a component product as a seller
 * 3. Assign the component product as a bundle of the main product
 * 4. Retrieve the bundle detail and verify all fields are correct
 * 5. Attempt to fetch a non-existent (random) bundle for the same product and
 *    ensure appropriate error is thrown
 */
export async function test_api_aimall_backend_test_get_product_bundle_detail_as_seller(
  connection: api.IConnection,
) {
  // 1. Create a main product for the seller
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const main_category_id = typia.random<string & tags.Format<"uuid">>();
  const main_product =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: main_category_id,
        seller_id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(main_product);

  // 2. Create a component product for the same seller
  const component_category_id = typia.random<string & tags.Format<"uuid">>();
  const component_product =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: component_category_id,
        seller_id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(component_product);

  // 3. Assign the component product as a bundle to the main product
  const is_required = true;
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const bundle =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: main_product.id,
        body: {
          bundle_product_id: main_product.id,
          component_product_id: component_product.id,
          is_required,
          quantity,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle);

  // 4. Retrieve the bundle detail and verify all fields
  const bundleDetail =
    await api.functional.aimall_backend.seller.products.productBundles.at(
      connection,
      {
        productId: main_product.id,
        productBundleId: bundle.id,
      },
    );
  typia.assert(bundleDetail);
  TestValidator.equals("bundle detail id")(bundleDetail.id)(bundle.id);
  TestValidator.equals("bundle detail bundle_product_id")(
    bundleDetail.bundle_product_id,
  )(main_product.id);
  TestValidator.equals("bundle detail component_product_id")(
    bundleDetail.component_product_id,
  )(component_product.id);
  TestValidator.equals("bundle detail is_required")(bundleDetail.is_required)(
    is_required,
  );
  TestValidator.equals("bundle detail quantity")(bundleDetail.quantity)(
    quantity,
  );

  // 5. Attempt to fetch bundle with a non-existent ID and verify error handling
  const nonExistentBundleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("fetch non-existent bundle should fail")(
    async () => {
      await api.functional.aimall_backend.seller.products.productBundles.at(
        connection,
        {
          productId: main_product.id,
          productBundleId: nonExistentBundleId,
        },
      );
    },
  );
}
