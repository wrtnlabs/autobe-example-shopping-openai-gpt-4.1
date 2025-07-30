import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that deleted product information is not retrievable via the product
 * detail API.
 *
 * This test ensures that when a product is created and then deleted by a
 * seller, any subsequent attempt to fetch its details via the public GET
 * endpoint results in a failure — no data should be exposed for deleted
 * products. This verifies the system's business logic and enforces data privacy
 * for removed listings.
 *
 * Workflow:
 *
 * 1. Create a new product using the seller product creation endpoint with valid
 *    random data.
 * 2. Delete the product by its ID using the seller deletion endpoint, simulating
 *    full removal.
 * 3. Attempt to retrieve the deleted product's detail via the public GET product
 *    API.
 * 4. Assert that the API does not return product data, and that an error (expected
 *    failure) occurs (error thrown, not IAimallBackendProduct instance).
 */
export async function test_api_aimall_backend_products_test_retrieve_deleted_product_restricted_from_public_access(
  connection: api.IConnection,
) {
  // 1. Create a new product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Delete the product
  await api.functional.aimall_backend.seller.products.erase(connection, {
    productId: product.id,
  });

  // 3. Try to retrieve the deleted product (expect error — no data should be available)
  await TestValidator.error("Access to deleted product must be rejected")(
    async () => {
      await api.functional.aimall_backend.products.at(connection, {
        productId: product.id,
      });
    },
  );
}
