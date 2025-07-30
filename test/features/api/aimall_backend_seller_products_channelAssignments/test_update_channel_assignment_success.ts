import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate the update of channel assignment attributes ('assigned_at'
 * timestamp) for a seller product.
 *
 * This test simulates a realistic scenario where a channel assignment's mutable
 * property ('assigned_at') is updated by a seller. It ensures that:
 *
 * - Only allowed fields are changed, other fields remain unchanged
 * - The 'assigned_at' value is reflected accurately in the response
 * - Type and business logic contracts are enforced
 *
 * Steps:
 *
 * 1. Create an administrator channel
 * 2. Create an administrator seller
 * 3. Create a product under the seller
 * 4. Assign the product to the channel (channel assignment)
 * 5. Update the channel assignment's 'assigned_at' value
 *
 *    - Verify that only 'assigned_at' changed
 *    - Other fields ('product_id', 'channel_id') remain the same
 *    - 'assigned_at' is updated to the new value
 * 6. No attempt is made to update non-mutable fields as that would violate DTO
 *    type constraints (see rules)
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_update_channel_assignment_success(
  connection: api.IConnection,
) {
  // 1. Create administrator channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph()(1),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create administrator seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(1),
          email: `${RandomGenerator.alphabets(8)}@example.com`,
          contact_phone: `010${typia.random<string>().substring(0, 8)}`,
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create product for above seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(2),
        description: RandomGenerator.paragraph()(2),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Assign product to channel (create assignment)
  const initialAssignedAt = new Date(Date.now() - 60 * 1000).toISOString();
  const assignment =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at: initialAssignedAt,
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Update 'assigned_at' only
  const updatedAssignedAt = new Date().toISOString();
  const updated =
    await api.functional.aimall_backend.seller.products.channelAssignments.update(
      connection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
        body: {
          assigned_at: updatedAssignedAt,
        } satisfies IAimallBackendChannelAssignment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("product_id unchanged")(updated.product_id)(
    assignment.product_id,
  );
  TestValidator.equals("channel_id unchanged")(updated.channel_id)(
    assignment.channel_id,
  );
  TestValidator.equals("assigned_at updated")(updated.assigned_at)(
    updatedAssignedAt,
  );
  TestValidator.notEquals("assigned_at actually changed")(updated.assigned_at)(
    assignment.assigned_at,
  );

  // 6. Per E2E test coding rules, do NOT attempt to type-break mutation of immutable/non-existent fields
}
