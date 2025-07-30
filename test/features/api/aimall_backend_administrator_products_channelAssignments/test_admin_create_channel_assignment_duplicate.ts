import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate duplicate channel assignment prevention for a product.
 *
 * This test ensures that if an administrator attempts to assign the same
 * product to the same channel more than once, the API correctly rejects the
 * second (duplicate) assignment with a uniqueness/duplication error.
 *
 * Steps:
 *
 * 1. Create a unique test channel using the admin API.
 * 2. Create a new product (random, using random category/seller UUIDs for FK
 *    isolation).
 * 3. Assign the product to the channel (expect success).
 * 4. Attempt the same assignment again (expect a duplicate/uniqueness error).
 * 5. Assert that the second attempt fails with an error (API throws).
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_admin_create_channel_assignment_duplicate(
  connection: api.IConnection,
) {
  // 1. Create a test channel
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.alphabets(8),
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 2. Create a test product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Assign the product to the channel (should succeed)
  const assignmentInput: IAimallBackendChannelAssignment.ICreate = {
    product_id: product.id,
    channel_id: channel.id,
    assigned_at: new Date().toISOString(),
  };
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: assignmentInput,
      },
    );
  typia.assert(assignment);

  // 4. Attempt the same assignment again (should fail with a uniqueness/duplication error)
  await TestValidator.error(
    "duplicate product-channel assignment should be rejected",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: assignmentInput,
      },
    );
  });
}
