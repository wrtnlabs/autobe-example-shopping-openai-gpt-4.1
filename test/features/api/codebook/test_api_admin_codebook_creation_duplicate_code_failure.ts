import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_admin_codebook_creation_duplicate_code_failure(
  connection: api.IConnection,
) {
  /**
   * Test duplicate codebook code enforcement for admin codebook creation.
   *
   * This test verifies that creating a codebook with a code that already exists
   * will fail, ensuring database uniqueness is enforced at the API level.
   *
   * Workflow:
   *
   * 1. Register and authenticate a new admin user (POST /auth/admin/join)
   * 2. Create a codebook with a unique code (POST
   *    /shoppingMallAiBackend/admin/codebooks)
   * 3. Attempt to create a second codebook using the same code (POST
   *    /shoppingMallAiBackend/admin/codebooks)
   * 4. Validate that the second creation fails due to unique constraint violation.
   */

  // 1. Register as admin
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@aiadmin.test`;
  const adminPassword = RandomGenerator.alphaNumeric(20);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(2),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create first codebook with unique code
  const uniqueCode = RandomGenerator.alphaNumeric(14);
  const firstCodebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(firstCodebook);
  TestValidator.equals(
    "first codebook code should match input",
    firstCodebook.code,
    uniqueCode,
  );

  // 3. Attempt to create second codebook with the same code
  await TestValidator.error(
    "duplicate codebook code should not be allowed",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.create(
        connection,
        {
          body: {
            code: uniqueCode, // duplicate code
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 10,
            }),
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 4,
              sentenceMax: 8,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IShoppingMallAiBackendCodebook.ICreate,
        },
      );
    },
  );
}
