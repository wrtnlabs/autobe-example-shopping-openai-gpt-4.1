import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate rejection of invalid category update operations by admin.
 *
 * This test ensures that the category update operation enforces robust input
 * validation on fields such as name and depth. The following negative scenarios
 * are covered:
 *
 * 1. Attempting to update a category with an empty/blank name string.
 * 2. Attempting to update a category with a negative value for depth (should only
 *    accept positive integers).
 * 3. Attempting to update a category with an invalid type for the name (e.g., a
 *    non-string value, but this cannot be expressed in valid TypeScript).
 *    Therefore, only runtime-type issues with valid TypeScript objects are
 *    tested.
 *
 * Steps:
 *
 * 1. Create a valid category for testing updates.
 * 2. Attempt to update the category with an empty name string and ensure the
 *    update is rejected with a validation error.
 * 3. Attempt to update the category with a negative depth (e.g., -1) and ensure
 *    the update is rejected with a validation error. Note: Invalid types for
 *    'name' or other fields cannot be tested in a type-safe TypeScript E2E test
 *    (i.e., cannot pass a number in place of string), so only logical business
 *    validation scenarios are exercised.
 */
export async function test_api_aimall_backend_administrator_categories_test_update_category_with_invalid_field_values_admin(
  connection: api.IConnection,
) {
  // 1. Create initial valid category
  const baseCategory =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "Valid Category Name",
          depth: 1,
        },
      },
    );
  typia.assert(baseCategory);

  // 2. Attempt to update with an empty name string (should fail validation)
  await TestValidator.error("empty name is rejected")(async () => {
    await api.functional.aimall_backend.administrator.categories.update(
      connection,
      {
        categoryId: baseCategory.id,
        body: {
          name: "",
        },
      },
    );
  });

  // 3. Attempt to update with a negative depth value (should fail validation)
  await TestValidator.error("negative depth is rejected")(async () => {
    await api.functional.aimall_backend.administrator.categories.update(
      connection,
      {
        categoryId: baseCategory.id,
        body: {
          depth: -1,
        },
      },
    );
  });
}
