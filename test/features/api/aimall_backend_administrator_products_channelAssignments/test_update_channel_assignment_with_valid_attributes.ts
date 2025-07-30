import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Test updating a channel assignment for a product as an administrator.
 *
 * This test covers the end-to-end workflow for updating an existing channel
 * assignment.
 *
 * Business Scenario:
 *
 * 1. Create a seller (dependency: seller required to create a product)
 * 2. Create a product for the seller (dependency: product required to assign to
 *    channel)
 * 3. Create a channel
 * 4. Assign the product to the channel (generates channelAssignmentId)
 * 5. Update the channel assignment's permitted field (assigned_at)
 * 6. Validate the update is reflected (assigned_at, product_id, channel_id)
 *
 * This scenario validates that an administrator can update an assignment's
 * allowed field, and the system correctly applies and returns the updated
 * values. Only attributes supported by the model (assigned_at) are tested, as
 * no additional metadata fields are exposed. The test asserts type safety and
 * business logic at every step. Audit log API validation is omitted as not
 * supported in this SDK.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_update_channel_assignment_with_valid_attributes(
  connection: api.IConnection,
) {
  // 1. Create a seller
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

  // 2. Create a product for the seller (using random but valid UUID for category_id)
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5).toUpperCase(),
          name: RandomGenerator.paragraph()(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 4. Assign the product to the channel
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at: new Date().toISOString(),
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Update the assignment (change the assigned_at timestamp)
  const updated_assigned_at = new Date(Date.now() + 60_000).toISOString(); // +60 seconds for demonstration
  const updated =
    await api.functional.aimall_backend.administrator.products.channelAssignments.update(
      connection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
        body: {
          assigned_at: updated_assigned_at,
        } satisfies IAimallBackendChannelAssignment.IUpdate,
      },
    );
  typia.assert(updated);

  // 6. Validate the update
  TestValidator.notEquals("assigned_at changed")(assignment.assigned_at)(
    updated.assigned_at,
  );
  TestValidator.equals("product_id unchanged")(updated.product_id)(
    assignment.product_id,
  );
  TestValidator.equals("channel_id unchanged")(updated.channel_id)(
    assignment.channel_id,
  );
}
