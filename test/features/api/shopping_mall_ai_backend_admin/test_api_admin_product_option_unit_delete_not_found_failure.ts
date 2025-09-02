import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate error handling behavior when deleting a non-existent product
 * option unit as admin.
 *
 * This test verifies that an authenticated admin attempting to delete a
 * product option unit (variant value) using DELETE
 * /shoppingMallAiBackend/admin/products/{productId}/options/{optionId}/units/{unitId}—where
 * the specified unitId does not exist—receives the correct error response
 * (not-found or appropriate business error). The admin user is registered
 * and authenticated but no product/option/unit setup is performed, so all
 * IDs used for deletion point to non-existent entities.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user using /auth/admin/join.
 * 2. Generate random UUIDs for productId, optionId, and unitId (these do not
 *    correspond to any real/existing entity).
 * 3. Attempt to delete the product option unit via the erase API.
 * 4. Assert that the API responds with an error, either 404 Not Found or a
 *    business logic error, confirming that deletion of a non-existent
 *    resource is handled as expected.
 */
export async function test_api_admin_product_option_unit_delete_not_found_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32), // Mimic secure hash
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    is_active: true,
    phone_number: null,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Generate random UUIDs for productId, optionId, unitId (non-existent)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  const unitId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the option unit that does NOT exist (expect error)
  await TestValidator.error(
    "deleting non-existent product option unit as admin should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.options.units.erase(
        connection,
        {
          productId,
          optionId,
          unitId,
        },
      );
    },
  );
}
