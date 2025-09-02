import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_codebook_update_failure_duplicate_name(
  connection: api.IConnection,
) {
  /**
   * Validates enforcement of codebook name/code uniqueness on update.
   *
   * Scenario:
   *
   * 1. Register an admin to obtain authorization context
   * 2. Create codebook A with a unique code
   * 3. Create codebook B with a different unique code
   * 4. Attempt to update codebook B's name to code A's code (simulating
   *    duplication/uniqueness violation on update)
   * 5. Verify update fails due to uniqueness constraint
   */

  // 1. Register an admin account for authorization context
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(2),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create the first codebook (A) with a unique code
  const codeA = RandomGenerator.alphaNumeric(7);
  const codebookA =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: codeA,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebookA);

  // 3. Create the second codebook (B) with a different unique code
  const codeB = RandomGenerator.alphaNumeric(7);
  const codebookB =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: codeB,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebookB);

  // 4. Attempt to update codebook B's name (not code, as DTO does not allow updating code): set name to codeA
  await TestValidator.error(
    "should reject update when codebook name duplicates an existing code (uniqueness constraint)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.update(
        connection,
        {
          codebookId: codebookB.id,
          body: {
            name: codeA,
          } satisfies IShoppingMallAiBackendCodebook.IUpdate,
        },
      );
    },
  );
}
