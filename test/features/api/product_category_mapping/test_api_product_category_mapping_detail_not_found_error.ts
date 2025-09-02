import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategoryMapping";

export async function test_api_product_category_mapping_detail_not_found_error(
  connection: api.IConnection,
) {
  /**
   * Validate error handling for retrieval of a non-existent product-category
   * mapping by mappingId.
   *
   * This test ensures that the backend returns a proper not-found error when an
   * authenticated admin user attempts to fetch the detail of a product-category
   * mapping record using a random/non-existent mappingId. No mapping record
   * should be leaked, and the response must indicate absence without
   * ambiguity.
   *
   * Steps:
   *
   * 1. Register and authenticate an admin account to set the required
   *    authorization context.
   * 2. Attempt to GET
   *    /shoppingMallAiBackend/admin/productCategoryMappings/{mappingId} using a
   *    random UUID not present in the system.
   * 3. Validate that a not-found error is thrown, and the system does not expose
   *    any sensitive information.
   */
  // 1. Register and authenticate admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Attempt to retrieve a mapping with a random (non-existent) UUID
  const fakeMappingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw not-found when mappingId does not exist",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productCategoryMappings.at(
        connection,
        {
          mappingId: fakeMappingId,
        },
      );
    },
  );
}
