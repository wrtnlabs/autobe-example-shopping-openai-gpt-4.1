import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_admin_codebook_creation_success(
  connection: api.IConnection,
) {
  /**
   * Validate the successful creation of a new codebook by an admin account.
   *
   * This test covers the full happy-path scenario for codebook creation:
   *
   * 1. Registers a new admin using /auth/admin/join with all required business
   *    fields.
   * 2. Uses the resulting authentication token for the session.
   * 3. Creates a codebook via /shoppingMallAiBackend/admin/codebooks with unique,
   *    valid code and name.
   * 4. Validates that the created codebook is returned, matches input, and
   *    contains all required metadata.
   *
   * Assertions cover correct authentication handling, validation of required
   * fields, and response property correctness.
   */
  // 1. Register a new admin account
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPasswordHash = RandomGenerator.alphaNumeric(24); // Simulate a password hash string
  const adminName = RandomGenerator.name();
  const adminEmail = `${adminUsername}@company.com`;
  const adminJoinResult: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: adminName,
        email: adminEmail,
        is_active: true,
        phone_number: null,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminJoinResult);
  TestValidator.equals(
    "admin username matches input",
    adminJoinResult.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin is_active is true",
    adminJoinResult.admin.is_active,
    true,
  );
  TestValidator.predicate(
    "admin token access is nonempty string",
    typeof adminJoinResult.token.access === "string" &&
      adminJoinResult.token.access.length > 0,
  );

  // 2. Create a new codebook entry as admin
  const codebookCode = `test_code_${RandomGenerator.alphaNumeric(8)}`;
  const codebookName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const codebookDescription = RandomGenerator.paragraph({ sentences: 7 });
  const createdCodebook: IShoppingMallAiBackendCodebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: codebookCode,
          name: codebookName,
          description: codebookDescription,
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(createdCodebook);
  TestValidator.equals(
    "created codebook code matches input",
    createdCodebook.code,
    codebookCode,
  );
  TestValidator.equals(
    "created codebook name matches input",
    createdCodebook.name,
    codebookName,
  );
  TestValidator.equals(
    "created codebook description matches input",
    createdCodebook.description,
    codebookDescription,
  );
  TestValidator.predicate(
    "created codebook id is present",
    typeof createdCodebook.id === "string" && createdCodebook.id.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp present",
    typeof createdCodebook.created_at === "string" &&
      createdCodebook.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    typeof createdCodebook.updated_at === "string" &&
      createdCodebook.updated_at.length > 0,
  );
  TestValidator.equals(
    "created codebook not deleted",
    createdCodebook.deleted_at,
    null,
  );
}
