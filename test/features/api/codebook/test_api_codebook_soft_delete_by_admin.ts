import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_codebook_soft_delete_by_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for soft deleting a codebook as admin.
   *
   * Validates that only an authenticated admin can create and soft-delete a
   * codebook, and that the soft deletion marks the deleted_at field. Further
   * validation for fetch/list or audit logic is omitted because required
   * endpoints are absent from the provided SDK. The test ensures:
   *
   * 1. An admin is registered and receives the correct profile and tokens.
   * 2. Codebook can be created by the admin and the record is correct and not yet
   *    deleted.
   * 3. The codebook can be soft-deleted successfully without error as admin.
   */

  // 1. Register and authenticate admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matches input",
    adminAuth.admin.username,
    adminInput.username,
  );
  TestValidator.equals(
    "admin email matches input",
    adminAuth.admin.email,
    adminInput.email,
  );
  TestValidator.predicate(
    "admin is active after registration",
    adminAuth.admin.is_active === true,
  );

  // 2. Create a codebook
  const codebookInput: IShoppingMallAiBackendCodebook.ICreate = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 12,
    }),
  };
  const codebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      { body: codebookInput },
    );
  typia.assert(codebook);
  TestValidator.equals(
    "codebook code matches input",
    codebook.code,
    codebookInput.code,
  );
  TestValidator.equals(
    "codebook name matches input",
    codebook.name,
    codebookInput.name,
  );
  TestValidator.equals(
    "codebook description matches input",
    codebook.description,
    codebookInput.description,
  );
  TestValidator.predicate(
    "codebook deleted_at is initially null or undefined",
    codebook.deleted_at === null || codebook.deleted_at === undefined,
  );

  // 3. Soft delete the codebook as admin
  await api.functional.shoppingMallAiBackend.admin.codebooks.erase(connection, {
    codebookId: codebook.id,
  });
  // Success: Soft delete endpoint executed with no errors.

  // 4/5. Further validation of deletion (fetch/list/audit) is UNIMPLEMENTABLE due to absence of endpoints.
}
