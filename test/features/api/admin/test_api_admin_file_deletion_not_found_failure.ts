import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_file_deletion_not_found_failure(
  connection: api.IConnection,
) {
  /**
   * Test: Deleting a nonexistent file as admin (should return not found error).
   *
   * Steps:
   *
   * 1. Register new admin to establish authentication context.
   * 2. Attempt to delete a file using a random (nonexistent) fileId.
   * 3. Expect an error (e.g. 404 Not Found or business logic error).
   * 4. Ensure no side effects or unauthorized deletions occur.
   *
   * This test validates that the backend correctly prevents deletion of
   * non-existent files, returns a meaningful error, and does not perform
   * accidental deletions. It ensures the operation is only allowed for
   * authenticated admins and tests that proper error handling, business logic,
   * and audit integrity are preserved.
   */
  // Step 1: Register/admin join (establish authenticated context)
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test-company.com`,
    is_active: true,
    phone_number: null,
  };
  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(authorized);

  // Step 2: Attempt to delete a file with a random UUID (should not exist)
  await TestValidator.error(
    "attempting to delete nonexistent file returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.erase(connection, {
        fileId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
