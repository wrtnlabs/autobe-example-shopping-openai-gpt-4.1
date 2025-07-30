import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test role-based access enforcement when listing child categories for a given
 * parent category as an administrator API.
 *
 * This test ensures that the endpoint GET
 * /aimall-backend/administrator/categories/{categoryId}/childCategories only
 * allows requests from administrator or seller roles, and explicitly denies
 * access to unauthorized users (such as customer or unauthenticated clients).
 *
 * Test Steps:
 *
 * 1. Attempt to call the endpoint as an "unauthenticated client" (no Authorization
 *    header). Verify that a forbidden error is returned.
 * 2. (Optional) If customer authentication is supported, attempt again
 *    authenticated as a "customer" role (should also be forbidden). (Skipped
 *    because customer authentication is not defined in API functions.)
 * 3. Now, as an "authorized admin" or "seller", call the endpoint. Verify the
 *    response structure conforms to IPageIAimallBackendCategory and paginated
 *    children are returned.
 *
 * This validates that the backend enforces proper access control for sensitive
 * category management operations.
 */
export async function test_api_aimall_backend_administrator_categories_childCategories_test_list_child_categories_permission_enforcement_for_admin_role(
  connection: api.IConnection,
) {
  // Step 1: Attempt unauthenticated access, expect forbidden error
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  const unauthenticatedConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete unauthenticatedConnection.headers.Authorization;
  await TestValidator.error("unauthenticated access must be forbidden")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.childCategories.index(
        unauthenticatedConnection,
        {
          categoryId: randomCategoryId,
        },
      );
    },
  );

  // Step 2: (If customer authentication is supported) test as customer. (Skipped; no customer authentication API is available.)

  // Step 3: Call as authorized admin/seller.
  // Assume the provided `connection` is already authenticated as an administrator or seller.
  const output =
    await api.functional.aimall_backend.administrator.categories.childCategories.index(
      connection,
      {
        categoryId: randomCategoryId,
      },
    );
  typia.assert(output);
}
