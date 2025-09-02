import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";

export async function test_api_admin_seller_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validates behavior when an admin attempts to fetch details for a
   * non-existent seller account.
   *
   * 1. Creates and authenticates an admin account using the /auth/admin/join
   *    endpoint.
   * 2. Attempts to retrieve seller detail via
   *    /shoppingMallAiBackend/admin/sellers/{sellerId}, but supplies a random
   *    UUID that does not belong to any known seller.
   * 3. Expects a not found (HTTP 404) business error (or equivalent) in the
   *    response, verifying that error handling for missing sellers is correctly
   *    implemented with admin authentication.
   * 4. Additional negative logic validation: If authentication is missing,
   *    endpoint access would fail for authorization, but this is implicitly
   *    tested by requiring admin join prior to use.
   */
  // Step 1: Admin account creation + authentication
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@admin-domain.test`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };

  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuth);
  // The authentication token is now in connection.headers.Authorization

  // Step 2: Attempt to access seller details with a non-existent sellerId
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "admin receives not found error when accessing non-existent seller",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.at(connection, {
        sellerId: randomSellerId,
      });
    },
  );
}
