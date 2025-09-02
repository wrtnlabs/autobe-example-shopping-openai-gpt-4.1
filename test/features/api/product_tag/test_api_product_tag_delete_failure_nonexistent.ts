import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test deletion of a non-existent product tag as an admin (failure
 * scenario).
 *
 * This test verifies the system's behavior when a privileged admin attempts
 * to soft-delete a product tag with a tagId that does not exist. It ensures
 * that:
 *
 * 1. Admin authentication and onboarding works as a prerequisite (via
 *    /auth/admin/join)
 * 2. The API properly enforces business rules around the existence of product
 *    tags for deletion, denying requests for tags that are missing.
 * 3. The expected business response is a handled error (not a silent pass)
 *    signifying resource absence (e.g., 404 Not Found or appropriate error
 *    type).
 *
 * Steps:
 *
 * 1. Register and authenticate an admin
 * 2. Attempt to delete a product tag using a random UUID that is highly
 *    unlikely to match any real tagId.
 * 3. Confirm that the operation fails with the proper error using
 *    TestValidator.error.
 *
 * This guards against the risk of erroneously passing deletion requests for
 * tags that should not exist, strengthening catalog data integrity and
 * system feedback consistency.
 */
export async function test_api_product_tag_delete_failure_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const username = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: `${username}@example.com` as string & tags.Format<"email">,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt to delete a non-existent product tag
  const invalidTagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Confirm that a handled error occurs (resource not found)
  await TestValidator.error(
    "admin deleting nonexistent product tag should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.erase(
        connection,
        { tagId: invalidTagId },
      );
    },
  );
}
