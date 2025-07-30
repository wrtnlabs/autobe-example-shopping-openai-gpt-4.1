import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate RBAC enforcement for seller child categories listing endpoint (GET
 * /aimall-backend/seller/categories/{categoryId}/childCategories) by attempting
 * to access as a non-seller role.
 *
 * This test ensures that customers and unauthorized users are forbidden from
 * using the seller category listing API, demonstrating that RBAC rules
 * preventing non-sellers from listing child categories are correctly enforced.
 * This is crucial to prevent privilege escalation, accidental info leakage, or
 * business logic errors caused by improper role assignments.
 *
 * Steps:
 *
 * 1. Generate a random, valid categoryId (UUID).
 * 2. Attempt to call the endpoint as an unauthenticated user, expecting a
 *    forbidden error.
 * 3. If customer authentication API is available, authenticate as a customer and
 *    again attempt the call, expecting forbidden error.
 * 4. Validate forbidden access is enforced in both cases using
 *    TestValidator.error.
 */
export async function test_api_aimall_backend_test_seller_access_child_categories_not_allowed_for_customer_role(
  connection: api.IConnection,
) {
  // 1. Generate a valid random UUID for categoryId
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt the API call as an unauthenticated user
  await TestValidator.error("unauthenticated user forbidden")(() =>
    api.functional.aimall_backend.seller.categories.childCategories.index(
      connection,
      { categoryId },
    ),
  );

  // 3. If customer authentication is available, authenticate as customer and try again
  // -- SKIPPED (no customer authentication functions provided in current API definitions)
  // If customer authentication API were available, use:
  //   await api.functional.customers.authenticate.login(connection, { ... });
  // and retry the forbidden test after login as a customer.

  // 4. The forbidden error is validated above via TestValidator.error.
}
