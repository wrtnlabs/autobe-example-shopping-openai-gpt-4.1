import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate administrator retrieval of a product's channel assignment detail.
 *
 * Ensures that an administrator can retrieve the full detail of a channel
 * assignment for a product after: (1) creating a channel, (2) creating a
 * seller, (3) creating a product belonging to the seller, (4) assigning the
 * product to the channel. Verifies all assignment metadata for completeness and
 * correctness.
 *
 * Steps:
 *
 * 1. Create a new sales/distribution channel via admin API
 *    (IAimallBackendChannel.ICreate).
 * 2. Create a new seller entity (IAimallBackendSeller.ICreate).
 * 3. Create a product owned by the seller (IAimallBackendProduct.ICreate).
 * 4. Assign the product to the channel, capture the resulting assignment ID.
 * 5. Retrieve the assignment by productId and channelAssignmentId as
 *    administrator.
 * 6. Validate that all returned assignment metadata matches what was created and
 *    assigned (ID, references, timestamps).
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_admin_retrieve_channel_assignment_detail_for_existing_assignment(
  connection: api.IConnection,
) {
  // 1. Create channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.alphabets(8),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(12),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create product (assign to seller)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Assign product to channel
  const assignedAt = new Date().toISOString();
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at: assignedAt,
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Retrieve channel assignment by productId/channelAssignmentId
  const retrieved =
    await api.functional.aimall_backend.administrator.products.channelAssignments.at(
      connection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
      },
    );
  typia.assert(retrieved);

  // 6. Validate: field-by-field checks
  TestValidator.equals("product id matches")(retrieved.product_id)(
    assignment.product_id,
  );
  TestValidator.equals("channel id matches")(retrieved.channel_id)(
    assignment.channel_id,
  );
  TestValidator.equals("assignment id matches")(retrieved.id)(assignment.id);
  TestValidator.equals("assigned at matches")(retrieved.assigned_at)(
    assignment.assigned_at,
  );
}
