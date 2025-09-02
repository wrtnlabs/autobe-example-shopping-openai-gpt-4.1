import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_codebook_delete_failure_already_deleted(
  connection: api.IConnection,
) {
  /**
   * Test error handling when deleting a soft-deleted codebook.
   *
   * 1. Register admin (required for codebook management)
   * 2. Create a new codebook
   * 3. Delete the codebook (soft-deletes it)
   * 4. Attempt to delete the same codebook again
   * 5. Validate that the second delete is handled as an error or idempotent
   *    (expected error or allowed idempotency)
   */

  // 1. Register admin
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const adminName = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create codebook
  const codebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebook);

  // 3. Delete the codebook (first time)
  await api.functional.shoppingMallAiBackend.admin.codebooks.erase(connection, {
    codebookId: codebook.id,
  });

  // 4. Try to delete again immediately (should fail or be idempotently handled)
  await TestValidator.error(
    "Deleting already-deleted codebook should fail or be idempotent",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.erase(
        connection,
        {
          codebookId: codebook.id,
        },
      );
    },
  );
}
