import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_product_category_soft_delete_not_found_failure(
  connection: api.IConnection,
) {
  /**
   * Tests that attempting to soft delete a product category with a non-existent
   * or already-deleted ID returns a not found or already deleted error.
   *
   * Steps:
   *
   * 1. Register/authenticate an admin via join endpoint to obtain admin privileges
   *    (using typia.random and RandomGenerator for credentials, omitting
   *    optional phone_number field).
   * 2. Attempt to DELETE a product category with a random UUID categoryId that is
   *    not associated with any actual category (no categories are created in
   *    this test setup).
   * 3. Assert that this operation throws a not-found or already-deleted error
   *    using TestValidator.error, confirming correct error handling for this
   *    failure scenario.
   *
   * Edge Case:
   *
   * - The random UUID categoryId is guaranteed not to match any real, undeleted
   *   category, ensuring that backend will return the expected error without
   *   risk of accidental collisions.
   * - No test data cleanup is required, as no persistent objects are created or
   *   modified.
   */

  // Step 1: Admin registration (join) and authentication for test session
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    is_active: true,
    // phone_number is optional and intentionally omitted
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);

  // Step 2 & 3: Attempt to soft delete a non-existent/already-deleted category
  await TestValidator.error(
    "soft deleting non-existent or already-deleted product category must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.erase(
        connection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
