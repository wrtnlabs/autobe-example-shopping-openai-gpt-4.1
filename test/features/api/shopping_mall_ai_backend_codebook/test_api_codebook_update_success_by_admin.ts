import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_codebook_update_success_by_admin(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin can successfully update a codebook's name and
   * description.
   *
   * Test workflow:
   *
   * 1. Register a privileged admin via /auth/admin/join
   * 2. Create a new codebook via /shoppingMallAiBackend/admin/codebooks
   * 3. Update the codebook's name and description using
   *    /shoppingMallAiBackend/admin/codebooks/{codebookId}
   * 4. Confirm changes are reflected and updated_at is refreshed; other fields
   *    remain unchanged.
   */

  // 1. Register new admin (privilege for update)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@testadmin.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create a codebook for update
  const codebookInput: IShoppingMallAiBackendCodebook.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  };
  const createdCodebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      { body: codebookInput },
    );
  typia.assert(createdCodebook);

  // 3. Update the codebook (name and description)
  const updateInput: IShoppingMallAiBackendCodebook.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
  };
  const updated =
    await api.functional.shoppingMallAiBackend.admin.codebooks.update(
      connection,
      {
        codebookId: createdCodebook.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Validate updates
  TestValidator.equals(
    "codebook name updated correctly",
    updated.name,
    updateInput.name,
  );
  TestValidator.equals(
    "codebook description updated correctly",
    updated.description,
    updateInput.description,
  );
  TestValidator.equals(
    "codebook code remains unchanged",
    updated.code,
    createdCodebook.code,
  );
  TestValidator.notEquals(
    "update timestamp was refreshed",
    updated.updated_at,
    createdCodebook.updated_at,
  );
  TestValidator.equals(
    "codebook id remains the same",
    updated.id,
    createdCodebook.id,
  );
  TestValidator.equals(
    "creation timestamp unchanged",
    updated.created_at,
    createdCodebook.created_at,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updated.deleted_at,
    createdCodebook.deleted_at,
  );
}
