import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";

export async function test_api_article_category_create_success_unique_name(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful creation of a unique article category as admin.
   *
   * 1. Register a new admin via /auth/admin/join for authentication/session.
   * 2. Use admin session to POST /shoppingMallAiBackend/admin/articleCategories
   *    with topical data.
   * 3. Provide unique category name, new random channel_id, display order (random
   *    int), and description.
   * 4. Assert that response contains UUID id, faithfully echoes input properties,
   *    includes business/audit fields, and is not soft-deleted.
   */

  // 1. Register new admin for authentication
  const adminUsername: string = RandomGenerator.alphaNumeric(8);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(5)}@company.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const adminName: string = RandomGenerator.name();
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: adminName,
    email: adminEmail,
    phone_number: null,
    is_active: true,
  };

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin.username matches input",
    adminAuth.admin.username,
    adminInput.username,
  );
  TestValidator.equals(
    "admin email matches input",
    adminAuth.admin.email,
    adminInput.email,
  );
  TestValidator.equals("admin is active", adminAuth.admin.is_active, true);

  // 2. Prepare unique article category data
  const uniqueCategoryName: string = `cat-${RandomGenerator.alphaNumeric(10)}`;
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const description: string = RandomGenerator.paragraph({ sentences: 3 });
  const order: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<99999>
  >();

  const newCategoryPayload: IShoppingMallAiBackendArticleCategory.ICreate = {
    parent_id: null,
    channel_id: channelId,
    name: uniqueCategoryName,
    description: description,
    order: order,
  };

  // 3. Create article category as admin
  const createdCategory =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.create(
      connection,
      { body: newCategoryPayload },
    );
  typia.assert(createdCategory);
  // 4. Validate category response against input and business rules
  TestValidator.predicate(
    "category id is valid UUID",
    typeof createdCategory.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(createdCategory.id),
  );
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    newCategoryPayload.name,
  );
  TestValidator.equals(
    "category channel_id matches input",
    createdCategory.channel_id,
    newCategoryPayload.channel_id,
  );
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    newCategoryPayload.description,
  );
  TestValidator.equals(
    "category order matches input",
    createdCategory.order,
    newCategoryPayload.order,
  );
  TestValidator.equals(
    "category parent_id is null for top-level",
    createdCategory.parent_id,
    null,
  );
  TestValidator.predicate(
    "category created_at is ISO string",
    typeof createdCategory.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.created_at),
  );
  TestValidator.predicate(
    "category updated_at is ISO string",
    typeof createdCategory.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.updated_at),
  );
  TestValidator.equals(
    "category not deleted (deleted_at should be null)",
    createdCategory.deleted_at,
    null,
  );
}
