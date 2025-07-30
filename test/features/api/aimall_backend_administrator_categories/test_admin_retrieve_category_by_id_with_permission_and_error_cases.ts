import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate administrator category detail view permission and error logic by
 * categoryId.
 *
 * This test covers the RBAC: administrators can retrieve any category via its
 * UUID, even those not accessible to customers. First, seller creates a group
 * of categories with various parent/child/nesting, using seller-side creation
 * API. Then, as admin (no actual admin auth API is exposed via SDK so we
 * simulate), attempt to GET details (via administrator/categories/:id endpoint)
 * for: valid categories, non-existent and invalid UUIDs. Verify correct
 * structure, the returned UUID matches, and all fields are present for each.
 * For non-existent or malformed id, expect proper 404 or validation error.
 * Also, check accessing this endpoint as a seller (if possible) yields a
 * permission error or forbidden/unauthorized response, as RBAC should protect
 * it.
 *
 * Steps:
 *
 * 1. Seller creates root and child categories.
 * 2. As administrator, GET categories by their ids and verify result (id, parent,
 *    name, depth match what was created), including categories not visible to
 *    customers.
 * 3. Try GET with random UUID that does not exist and expect 404.
 * 4. Try GET with invalid UUID format: expect validation/business error.
 * 5. (If possible) As seller (non-privileged), attempt to GET via the admin
 *    categories endpoint: expect permission/forbidden error.
 */
export async function test_api_aimall_backend_administrator_categories_test_admin_retrieve_category_by_id_with_permission_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Seller creates several categories for testing, nested and root
  const rootCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.alphabets(10),
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(rootCategory);

  const childCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name: RandomGenerator.alphabets(12),
        depth: 2,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(childCategory);

  // 2. As admin, retrieve both categories using the admin endpoint
  const rootResult =
    await api.functional.aimall_backend.administrator.categories.at(
      connection,
      { categoryId: rootCategory.id },
    );
  typia.assert(rootResult);
  TestValidator.equals("root category id matches")(rootResult.id)(
    rootCategory.id,
  );
  TestValidator.equals("root category parent")(rootResult.parent_id)(
    rootCategory.parent_id,
  );
  TestValidator.equals("root category name")(rootResult.name)(
    rootCategory.name,
  );
  TestValidator.equals("root category depth")(rootResult.depth)(
    rootCategory.depth,
  );

  const childResult =
    await api.functional.aimall_backend.administrator.categories.at(
      connection,
      { categoryId: childCategory.id },
    );
  typia.assert(childResult);
  TestValidator.equals("child category id matches")(childResult.id)(
    childCategory.id,
  );
  TestValidator.equals("child category parent")(childResult.parent_id)(
    childCategory.parent_id,
  );
  TestValidator.equals("child category name")(childResult.name)(
    childCategory.name,
  );
  TestValidator.equals("child category depth")(childResult.depth)(
    childCategory.depth,
  );

  // 3. Try GET with a non-existent random UUID - expect error (404)
  await TestValidator.error("GET with non-existent id returns 404 error")(() =>
    api.functional.aimall_backend.administrator.categories.at(connection, {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 4. Try GET with an invalid UUID (format error)
  await TestValidator.error(
    "GET with invalid UUID string throws 400/validation error",
  )(() =>
    api.functional.aimall_backend.administrator.categories.at(connection, {
      categoryId: "not-a-uuid" as any,
    }),
  );

  // 5. (If possible) Call as seller: we have only one connection so cannot switch roles - skip explicit RBAC check.
}
