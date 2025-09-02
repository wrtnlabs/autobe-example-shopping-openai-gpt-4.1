import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";

export async function test_api_codebook_entry_creation_duplicate_code_error(
  connection: api.IConnection,
) {
  /**
   * Test that creating a codebook entry with a duplicate code in the same
   * codebook is rejected.
   *
   * 1. Join as new admin (authentication)
   * 2. Select or generate an existing codebookId (assume existence)
   * 3. Create an entry for this codebookId with a specific code
   * 4. Attempt to create another entry on the same codebookId with the same code
   * 5. Expect a validation error for duplicate code, and ensure the operation is
   *    rejected
   */

  // Step 1: Admin join for authentication context
  const adminJoin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.name(),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: null,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // Step 2: Choose or create a codebookId (assume it exists for this test)
  const codebookId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Create a codebook entry with a specific code
  const uniqueCode = RandomGenerator.alphaNumeric(8);
  const firstEntry =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
      connection,
      {
        codebookId,
        body: {
          code: uniqueCode,
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          order: 1,
          visible: true,
        } satisfies IShoppingMallAiBackendCodebookEntry.ICreate,
      },
    );
  typia.assert(firstEntry);
  TestValidator.equals(
    "codebook entry code matches",
    firstEntry.code,
    uniqueCode,
  );
  TestValidator.equals(
    "codebook entry belongs to codebook",
    firstEntry.shopping_mall_ai_backend_codebook_id,
    codebookId,
  );

  // Step 4: Try to create a duplicate entry (same code and codebookId)
  await TestValidator.error(
    "duplicate code in same codebook should error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
        connection,
        {
          codebookId,
          body: {
            code: uniqueCode,
            label: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            order: 2,
            visible: true,
          } satisfies IShoppingMallAiBackendCodebookEntry.ICreate,
        },
      );
    },
  );
}
