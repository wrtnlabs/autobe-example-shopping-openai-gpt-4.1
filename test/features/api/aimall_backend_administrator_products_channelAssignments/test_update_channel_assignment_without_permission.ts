import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate that updating a channel assignment cannot be performed by an
 * unauthorized (non-admin) user.
 *
 * This test sets up a seller, channel, product, and associated channel
 * assignment using administrator privileges, then attempts to update the
 * assignment using a connection without admin privileges.
 *
 * Key steps:
 *
 * 1. (As admin) Create a seller
 * 2. (As admin) Create a product owned by that seller
 * 3. (As admin) Create a channel
 * 4. (As admin) Assign the product to the channel
 * 5. Remove Authorization from connection to simulate non-admin
 * 6. Attempt to update the channel assignment (should return 403 Forbidden)
 *
 * This test validates that the endpoint enforces RBAC by refusing update
 * attempts from unprivileged users.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_update_channel_assignment_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a seller (as admin)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create product owned by seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 4. Assign product to channel
  const now = new Date().toISOString();
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at: now,
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Remove Authorization header to simulate non-admin context
  const nonAdminHeaders = { ...connection.headers };
  delete nonAdminHeaders.Authorization;
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: nonAdminHeaders,
  };

  // 6. Attempt forbidden update as a non-admin
  await TestValidator.error("non-admin update forbidden")(() =>
    api.functional.aimall_backend.administrator.products.channelAssignments.update(
      nonAdminConnection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
        body: {
          assigned_at: new Date().toISOString(),
        } satisfies IAimallBackendChannelAssignment.IUpdate,
      },
    ),
  );
}
