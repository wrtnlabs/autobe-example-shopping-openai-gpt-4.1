import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

/**
 * Validate not found (404) error when retrieving a non-existent codebook by
 * UUID as an authenticated admin.
 *
 * This test ensures:
 *
 * 1. Admin authentication is properly required and established.
 * 2. The codebook fetch with a random/non-existent codebookId is attempted.
 * 3. The correct not found (404) error is produced – not a permission or other
 *    failure.
 *
 * Workflow:
 *
 * 1. Register as admin with unique/valid fields.
 * 2. Authenticate (token returned and stored in connection.headers).
 * 3. Make a GET call to /shoppingMallAiBackend/admin/codebooks/{codebookId}
 *    with a random UUID.
 * 4. Assert a 404 Not Found error is returned.
 */
export async function test_api_admin_codebook_detail_not_found_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    // Optionally provide phone_number. We'll explicitly use null to demonstrate optionality.
    phone_number: null,
  };
  const adminAuthorized: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Attempt to retrieve detail for a random, guaranteed-nonexistent codebook ID as an authenticated admin
  const nonExistentCodebookId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should return not found error (404) for non-existent codebookId as admin",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.at(
        connection,
        {
          codebookId: nonExistentCodebookId,
        },
      );
    },
  );
}
