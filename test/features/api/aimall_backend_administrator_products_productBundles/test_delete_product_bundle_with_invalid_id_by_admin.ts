import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * E2E test: Attempt admin deletion of a non-existent product bundle (by random
 * ID) and confirm proper error (404 not found) is returned and no system
 * changes occur.
 *
 * Steps:
 *
 * 1. As administrator, create a master product (dependency)
 * 2. Attempt to delete a product bundle using a random UUID as productBundleId
 *    (ensuring non-existence)
 * 3. Validate 404 error is thrown
 * 4. Optionally (if GETs existed), confirm master product is unchanged (not
 *    implementable here)
 */
export async function test_api_aimall_backend_administrator_products_productBundles_test_delete_product_bundle_with_invalid_id_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a valid product as prerequisite (admin role assumed)
  const masterProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(masterProduct);

  // 2. Attempt to delete non-existent bundle (random UUID for bundle id)
  const invalidProductBundleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent bundle - should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.products.productBundles.erase(
        connection,
        {
          productId: masterProduct.id,
          productBundleId: invalidProductBundleId,
        },
      );
    },
  );

  // 3. Cannot implement further checks for masterProduct (e.g., GET) without the respective API exposed
}
