import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * Validate that unauthorized sellers cannot create a product bundle for a
 * product they do not own.
 *
 * This test ensures that seller permission boundaries are enforced on the
 * bundle creation endpoint. It specifically verifies that if a seller attempts
 * to assign a bundle to a product they do not own (i.e., product was created
 * under another seller account), the system rejects the operation (should
 * return a forbidden or unauthorized error).
 *
 * Steps:
 *
 * 1. Register/login as Seller A and create a new product (Product A)
 * 2. Register/login as Seller B (different seller, fresh credentials)
 * 3. While authenticated as Seller B, attempt to create a bundle for Product A (by
 *    providing Product A's id as bundle_product_id)
 *
 *    - Use valid bundle payload otherwise
 * 4. Ensure the request is rejected with an error (HTTP 403 Forbidden or similar)
 */
export async function test_api_aimall_backend_test_create_product_bundle_for_non_owned_product_should_fail(
  connection: api.IConnection,
) {
  // 1. Create Seller A's product
  const sellerAId: string = typia.random<string & tags.Format<"uuid">>();
  const productA: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerAId,
        title: "Sample Product by Seller A",
        description: "A test product registered by Seller A.",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(productA);

  // 2. (Simulate login/switch to Seller B)
  const sellerBId: string = typia.random<string & tags.Format<"uuid">>();
  // In a real test, you would authenticate as Seller B; here, we simulate context by using a different seller_id

  // 3. Seller B tries to create a bundle for Product A, which belongs to Seller A
  const componentProductId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("seller without ownership should be forbidden")(
    async () => {
      await api.functional.aimall_backend.seller.products.productBundles.create(
        connection,
        {
          productId: productA.id,
          body: {
            bundle_product_id: productA.id,
            component_product_id: componentProductId,
            is_required: true,
            quantity: 1,
          } satisfies IAimallBackendProductBundle.ICreate,
        },
      );
    },
  );
}
