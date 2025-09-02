import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_product_tag_delete_failure_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test that deletion of a product tag without admin authentication fails with
   * an authorization error.
   *
   * This verifies the security layer of the DELETE
   * /shoppingMallAiBackend/admin/productTags/{tagId} endpoint:
   *
   * - Confirms that even if the system has a valid admin account, attempting
   *   deletion without authentication triggers an error.
   * - Ensures random tag IDs are not an excuse for bypassing auth checks;
   *   endpoint should return auth error regardless of tag existence.
   *
   * Steps:
   *
   * 1. Register a valid admin account (to satisfy precondition, but do NOT use
   *    credentials for deletion attempt).
   * 2. Prepare a connection with empty headers (ensuring no Authentication sent).
   * 3. Generate a random tag UUID for the deletion attempt.
   * 4. Attempt deletion of the product tag as an unauthorized user and assert an
   *    error is thrown.
   */

  // 1. Register admin (to ensure the system can enforce auth, not for token)
  const adminCreateInput = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  await api.functional.auth.admin.join(connection, { body: adminCreateInput });

  // 2. Prepare connection without Authorization header
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Generate random tagId (uuid)
  const tagId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt delete as unauthorized user; expect authorization failure
  await TestValidator.error(
    "delete product tag fails without admin authorization",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.erase(
        unauthorizedConnection,
        { tagId },
      );
    },
  );
}
