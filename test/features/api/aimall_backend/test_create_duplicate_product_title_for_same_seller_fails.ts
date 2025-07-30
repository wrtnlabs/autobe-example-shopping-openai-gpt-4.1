import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validates that creating a duplicate product title for the same seller is
 * prohibited.
 *
 * This test ensures that the business logic enforcing unique product titles per
 * seller is correctly applied. It attempts to create two products with the same
 * title under the same seller:
 *
 * - The first creation should succeed (the product is created).
 * - The second creation should fail due to the uniqueness constraint on
 *   seller/title pairs.
 *
 * Steps:
 *
 * 1. Prepare random but valid seller_id and category_id (UUIDs) and a unique title
 *    string.
 * 2. Create the first product for the seller/category/title combination (should
 *    succeed).
 * 3. Attempt to create a second product with the same seller, category, and title
 *    (should fail with an error).
 * 4. Validate that the first succeeded and the second failed as expected.
 */
export async function test_api_aimall_backend_test_create_duplicate_product_title_for_same_seller_fails(
  connection: api.IConnection,
) {
  // 1. Prepare UUIDs and unique product title
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const productTitle = "Test Product " + RandomGenerator.alphabets(8);

  // 2. Create first product for this seller & title (should succeed)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id,
        seller_id,
        title: productTitle,
        description: "Initial product for uniqueness test.",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("created title matches")(product.title)(productTitle);
  TestValidator.equals("created seller matches")(product.seller_id)(seller_id);
  TestValidator.equals("created category matches")(product.category_id)(
    category_id,
  );

  // 3. Try to create duplicate title under same seller (should fail)
  await TestValidator.error(
    "Should reject duplicate product title for same seller",
  )(async () => {
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id,
        title: productTitle,
        description:
          "Attempt to create duplicate product title for uniqueness test.",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  });
}
