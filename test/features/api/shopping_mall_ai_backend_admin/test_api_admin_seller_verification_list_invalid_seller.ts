import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";
import type { IPageIShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSellerVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_seller_verification_list_invalid_seller(
  connection: api.IConnection,
) {
  /**
   * Test querying seller verifications for a non-existent seller.
   *
   * This test verifies that the system returns a proper error (not-found or
   * validation error) when an admin attempts to list verifications for a seller
   * that does not exist. It ensures admins cannot access or search verification
   * evidence for invalid seller references, protecting system integrity and
   * evidential audit flows.
   *
   * Steps:
   *
   * 1. Register and authenticate as an admin to acquire authorization for
   *    protected admin routes.
   * 2. Attempt to invoke the seller verification PATCH API on a random
   *    (non-existent) seller UUID.
   * 3. Expect and validate that the system returns an error response, confirming
   *    invalid seller access is blocked.
   */

  // 1. Register and authenticate as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt to list verifications for a non-existent seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to list verifications for a non-existent seller",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.verifications.index(
        connection,
        {
          sellerId: nonExistentSellerId,
          body: {},
        },
      );
    },
  );
}
