import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

/**
 * E2E test verifying admin can hard delete an article category.
 *
 * This test exercises the complete business workflow for verifying that
 * admin users can permanently (hard) delete an article category through the
 * API. The following flow is validated:
 *
 * 1. Admin account registration to enable privileged access.
 * 2. Article category creation for a valid, known id.
 * 3. Hard deletion (irreversible erase) using the category id as admin.
 * 4. (Optional, but not tested here): Confirming the category cannot be
 *    fetched or listed after deletion (not implemented due to lack of
 *    listing/fetch endpoint in SDK).
 *
 * All steps are performed only using SDK functions available. Only
 * properties and functions supplied in the DTO and SDK specs are used. The
 * core business requirement is that permanent removal (not soft deletion)
 * occurs, validating compliance with hard delete expectations.
 */
export async function test_api_article_category_hard_delete_success(
  connection: api.IConnection,
) {
  // 1. Register an admin - required for privileged endpoints
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name().replace(/ /g, "_").toLowerCase(),
    password_hash: RandomGenerator.alphaNumeric(32), // simulates a hash
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "created admin username matches input",
    adminAuth.admin.username,
    adminInput.username,
  );

  // 2. Create article category
  const categoryInput: IShoppingMallAiBackendArticleCategory.ICreate = {
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
    order: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    // parent_id omitted for top-level
  };
  const createdCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      { body: categoryInput },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryInput.name,
  );

  // 3. Erase the article category (hard delete)
  await api.functional.shoppingMallAiBackend.admin.articleCategories.erase(
    connection,
    { articleCategoryId: createdCategory.id },
  );

  // 4. (Untestable): Would confirm deletion by get/list, but those SDKs are not available
}
