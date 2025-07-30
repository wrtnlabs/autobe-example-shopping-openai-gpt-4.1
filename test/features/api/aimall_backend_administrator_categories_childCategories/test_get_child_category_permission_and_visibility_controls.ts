import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * RBAC and access control for child category details retrieval.
 *
 * This test validates the role-based access control (RBAC) for fetching details
 * of a child category under a parent with the administrator endpoint. Only
 * users with administrator or seller privileges can retrieve child category
 * details. The test verifies access restrictions by attempting requests as
 * different user types: administrator, seller, customer, and unauthenticated.
 *
 * Steps:
 *
 * 1. Generate valid parent and child category UUIDs.
 * 2. Attempt to retrieve as an unauthorized user (should throw error).
 * 3. (If authentication endpoints are available, test as admin, seller, and
 *    customer roles).
 *
 * Since only the provided child category endpoint is available and no
 * authentication endpoints exist in the given SDK/functions, only the
 * unauthenticated (forbidden/unauthorized) test can be performed.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_get_child_category_permission_and_visibility_controls(
  connection: api.IConnection,
) {
  // 1. Generate valid UUIDs for parent and child category
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const childCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve child category as unauthenticated/unauthorized user
  await TestValidator.error(
    "unauthorized/forbidden error for public/unauthenticated user",
  )(() =>
    api.functional.aimall_backend.administrator.categories.childCategories.at(
      connection,
      {
        categoryId: parentCategoryId,
        childCategoryId: childCategoryId,
      },
    ),
  );
}
