import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Verify that non-admin users (customers/guests) are denied access to the
 * review attachment list endpoint.
 *
 * This test ensures that a customer (who is not an admin) is forbidden from
 * accessing the administrator-only review attachment list API. Accessing this
 * endpoint as a non-admin must result in a permission error (e.g., 403) and
 * must not expose any attachment data under any circumstances.
 *
 * Workflow:
 *
 * 1. Register a new customer account via the public/customer registration endpoint
 * 2. Attempt to invoke the administrator review attachment list API with a random
 *    reviewId as that customer
 * 3. Assert that a permission error (e.g., 403 Forbidden) is thrown and no
 *    attachment data is revealed
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_get_all_review_attachments_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Attempt to access the admin-only review attachment list as non-admin
  TestValidator.error("non-admin forbidden from admin review attachments API")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.attachments.index(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
