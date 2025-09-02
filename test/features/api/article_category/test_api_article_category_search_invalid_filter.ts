import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import type { IPageIShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that searching for article categories with invalid or
 * non-existent filter criteria (as admin) returns an empty list or business
 * error, without crashing or returning incorrect results.
 *
 * Steps:
 *
 * 1. Register as an admin
 * 2. Query the article categories index endpoint with deliberately
 *    invalid/non-existent filters (e.g., random name, parent_id,
 *    channel_id)
 * 3. Confirm that the result is an empty array (data) and/or minimal
 *    pagination (records: 0), or that a business error is returned as
 *    expected
 * 4. Assert that no data is unexpectedly returned for impossible filter
 *    values, and that response shape is correct
 */
export async function test_api_article_category_search_invalid_filter(
  connection: api.IConnection,
) {
  // 1. Register as admin with random credentials
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(6)}@test-domain.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt search with totally impossible values (fake name, parent_id, channel_id)
  // use new random UUIDs that cannot exist in actual DB
  const fakeParentId = typia.random<string & tags.Format<"uuid">>();
  const fakeChannelId = typia.random<string & tags.Format<"uuid">>();
  const impossibleName = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 10,
    wordMax: 16,
  });

  const result =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
      connection,
      {
        body: {
          q: impossibleName,
          parent_id: fakeParentId,
          channel_id: fakeChannelId,
          // Deliberately use pagination values
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
      },
    );
  typia.assert(result);
  // Should not throw error: returns empty data array and records=0 if no matches
  TestValidator.equals(
    "search with impossible filter returns empty data array",
    result.data,
    [],
  );
  TestValidator.equals(
    "search with impossible filter returns zero records",
    result.pagination.records,
    0,
  );
}
