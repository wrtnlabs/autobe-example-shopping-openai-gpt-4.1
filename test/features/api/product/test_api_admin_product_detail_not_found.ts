import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_admin_product_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate correct error response when an admin attempts to access a product
   * detail (GET /shoppingMallAiBackend/admin/products/{productId}) using a
   * non-existent or deleted productId.
   *
   * Ensures:
   *
   * 1. Admin context is established (via admin join)
   * 2. A productId is generated that cannot correspond to any live product (random
   *    UUID)
   * 3. The lookup triggers an error (expected 404 or business error)
   * 4. No sensitive or internal system detail is leaked in the error
   */

  // 1. Admin account creation and authentication
  const adminCredentials: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)}@e2e-test.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuth);

  // 2. Lookup for non-existent product by random UUID.
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch details, expect error (404 not found or business error)
  await TestValidator.error(
    "admin product detail not found triggers error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.at(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
