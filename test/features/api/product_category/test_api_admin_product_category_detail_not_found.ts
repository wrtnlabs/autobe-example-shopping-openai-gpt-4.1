import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_admin_product_category_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error handling for non-existent or deleted product category
   * retrieval (admin).
   *
   * This test verifies that the API correctly responds with an error (e.g., 404
   * Not Found) or an appropriate business signal when an admin requests the
   * details of a product category that does not exist or has been deleted.
   *
   * Steps:
   *
   * 1. Register (join) as an admin to obtain authentication context for subsequent
   *    requests.
   * 2. Attempt to fetch product category details using a random UUID that does not
   *    match any valid category (and should not match a soft-deleted category
   *    either, unless the API renders those as accessible for admins).
   * 3. Assert an error is thrown (such as 404 Not Found) or rejected promise,
   *    confirming that non-existent or deleted categories are appropriately
   *    inaccessible via the admin detail endpoint.
   */

  // Step 1: Admin registration and authentication
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@test-admin.com` as string &
      tags.Format<"email">,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // Step 2/3: Use random UUID for a non-existent categoryId
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should throw error for non-existent or deleted category detail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategories.at(
        connection,
        {
          categoryId: nonExistentCategoryId,
        },
      );
    },
  );
}
