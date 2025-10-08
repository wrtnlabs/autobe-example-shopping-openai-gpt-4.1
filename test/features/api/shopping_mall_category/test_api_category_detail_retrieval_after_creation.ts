import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate detail retrieval for a product category after creation by admin.
 *
 * This test covers full admin onboarding, category creation, and subsequent
 * detailed retrieval including field-by-field validation. It also ensures error
 * handling for invalid categoryId fetches.
 *
 * Steps:
 *
 * 1. Register a new shopping mall admin (join)
 * 2. Create a new category via admin interface
 * 3. Retrieve the category's details using its id
 * 4. Assert all relevant fields match (names, parent_id, descriptions,
 *    display_order, is_active)
 * 5. Verify presence and format of audit fields (created_at, updated_at,
 *    deleted_at)
 * 6. Test retrieval of a non-existent categoryId (should error)
 */
export async function test_api_category_detail_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Category creation
  const categoryInput = {
    parent_id: undefined, // root category
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    description_ko: RandomGenerator.paragraph(),
    description_en: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(createdCategory);

  // 3. Retrieve category by id
  const fetched = await api.functional.shoppingMall.categories.at(connection, {
    categoryId: createdCategory.id,
  });
  typia.assert(fetched);

  // 4. Field assertions
  TestValidator.equals("category id matches", fetched.id, createdCategory.id);
  TestValidator.equals(
    "parent_id matches",
    fetched.parent_id,
    categoryInput.parent_id,
  );
  TestValidator.equals(
    "name_ko matches",
    fetched.name_ko,
    categoryInput.name_ko,
  );
  TestValidator.equals(
    "name_en matches",
    fetched.name_en,
    categoryInput.name_en,
  );
  TestValidator.equals(
    "description_ko matches",
    fetched.description_ko,
    categoryInput.description_ko,
  );
  TestValidator.equals(
    "description_en matches",
    fetched.description_en,
    categoryInput.description_en,
  );
  TestValidator.equals(
    "display_order matches",
    fetched.display_order,
    categoryInput.display_order,
  );
  TestValidator.equals(
    "is_active matches",
    fetched.is_active,
    categoryInput.is_active,
  );
  TestValidator.predicate(
    "created_at exists (string)",
    typeof fetched.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists (string)",
    typeof fetched.updated_at === "string",
  );
  // deleted_at can be null or undefined since not deleted yet
  TestValidator.equals(
    "deleted_at should be null or undefined",
    fetched.deleted_at,
    null,
  );

  // 5. Error scenario: fetch with random/non-existent ID
  await TestValidator.error(
    "fetching non-existent categoryId throws error",
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
