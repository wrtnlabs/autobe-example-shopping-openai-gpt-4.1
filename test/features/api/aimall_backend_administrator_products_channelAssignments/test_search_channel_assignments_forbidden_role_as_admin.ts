import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify unauthorized role access is forbidden for channel assignments search.
 *
 * This test ensures users lacking administrator privileges cannot query channel
 * assignments through the PATCH endpoint under the admin products route.
 *
 * Steps:
 *
 * 1. Create a product as a valid admin to establish a test context.
 * 2. Without admin privileges, attempt to search channel assignments for the
 *    product.
 * 3. Confirm the result is a 403 Forbidden (or equivalent access denied) error.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_search_channel_assignments_forbidden_role_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a product as admin context.
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Unauthorized Channel Assignments Test Product",
          description: "Created in admin context for forbidden test.",
          status: "active",
        },
      },
    );
  typia.assert(product);

  // Here, it is assumed that `connection` lacks administrator privileges for this step.
  // No user switching API is given, so the access right is presumed set up outside this function.

  // 2. Attempt channel assignments search as unauthorized user.
  await TestValidator.error(
    "Non-admin user forbidden from channel assignment search",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {}, // Both fields optional/null
      },
    );
  });
}
