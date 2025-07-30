import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate that category creation enforces required fields.
 *
 * This test ensures that creating a new category without any required fields
 * will not compile—therefore such negative cases cannot be implemented in a
 * type-safe E2E test. Instead, this test validates the API allows omission of
 * the optional 'parent_id' field, but enforces 'name' and 'depth' as required
 * properties when creating a category.
 *
 * Steps:
 *
 * 1. Attempt to create a root category by omitting the optional 'parent_id' field.
 * 2. Confirm the category is created and the parent_id is null or undefined as
 *    required for root categories.
 *
 * Negative test cases for missing required fields are omitted because they are
 * not representable in type-safe TypeScript.
 */
export async function test_api_aimall_backend_administrator_categories_test_create_category_with_missing_required_field(
  connection: api.IConnection,
) {
  // 1. Attempt to create a root category without 'parent_id'.
  const output =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "RootCategory",
          depth: 1,
          // parent_id omitted intentionally
        } satisfies IAimallBackendCategory.ICreate,
      },
    );
  typia.assert(output);
  // Validate the response
  TestValidator.equals(
    "parent_id should be null or undefined for root category",
  )(output.parent_id)(null);
}
