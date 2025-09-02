import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import type { IPageIShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebook";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_codebook_search_invalid_filter(
  connection: api.IConnection,
) {
  /**
   * Test codebook search failure on invalid filter and pagination parameters.
   *
   * This test verifies that when an admin attempts to search/list codebooks
   * with invalid filter or pagination values, the API enforces DTO constraints
   * and returns appropriate validation errors, without leaking result data.
   *
   * Steps:
   *
   * 1. Register a new admin account (to obtain proper authentication, as required
   *    for codebook operations).
   * 2. Attempt to search codebooks with a negative page number (page < 1): expect
   *    validation error.
   * 3. Attempt to search codebooks with a zero limit (limit < 1): expect
   *    validation error.
   * 4. Attempt to search codebooks with an invalid created_from field (not a
   *    date-time string): expect validation error.
   * 5. Confirm all such invalid requests are properly handled with an error and do
   *    not return results.
   */

  // 1. Register & authenticate a new admin (prerequisite for subsequent operations)
  const adminUsername: string = RandomGenerator.alphaNumeric(8);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(24),
        name: RandomGenerator.name(),
        email: `${adminUsername}@test.com`,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Negative page (should fail validation)
  await TestValidator.error(
    "codebook search fails with negative page",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.index(
        connection,
        {
          body: {
            page: -5,
            limit: 10,
          } satisfies IShoppingMallAiBackendCodebook.IRequest,
        },
      );
    },
  );

  // 3. Zero limit (should fail validation)
  await TestValidator.error(
    "codebook search fails with zero limit",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.index(
        connection,
        {
          body: {
            page: 1,
            limit: 0,
          } satisfies IShoppingMallAiBackendCodebook.IRequest,
        },
      );
    },
  );

  // 4. Invalid created_from format (should fail validation)
  await TestValidator.error(
    "codebook search fails with invalid created_from date",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.index(
        connection,
        {
          body: {
            created_from: "not-a-date-time",
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAiBackendCodebook.IRequest,
        },
      );
    },
  );
}
