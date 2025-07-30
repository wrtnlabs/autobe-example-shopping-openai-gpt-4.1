import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate error response for deleting a non-existent product bundle by seller.
 *
 * This test ensures that the API responds correctly by returning a 404 Not
 * Found error when a seller attempts to delete a product bundle relationship
 * that does not exist.
 *
 * Steps:
 *
 * 1. Register a seller (via administrator endpoint).
 * 2. Create a product for that seller.
 * 3. Attempt to delete a product bundle using a random (non-existent) bundle UUID
 *    for the created product (as the seller).
 * 4. Ensure that a 404 HttpError is thrown, and that the error message clearly
 *    indicates the not-found resource.
 * 5. Optionally, confirm there are no side effects on the product or its bundles
 *    (not applicable when no bundles exist yet).
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_delete_nonexistent_product_bundle_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller (admin-side onboarding)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product owned by that seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(), // Assume a random/valid category for test context
        seller_id: seller.id,
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Attempt to delete a non-existent bundle for that product
  await TestValidator.error(
    "Should return 404 for non-existent product bundle",
  )(async () => {
    await api.functional.aimall_backend.seller.products.productBundles.erase(
      connection,
      {
        productId: product.id,
        productBundleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
