import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate retrieval of channel assignment detail for an existing assignment.
 *
 * This test ensures that, after assigning a product to a channel, retrieving
 * the channel assignment detail returns all expected fields and data integrity
 * is maintained. The scenario covers full workflow: channel creation, seller
 * onboarding, product creation, channel assignment, and verification via GET.
 *
 * Steps:
 *
 * 1. Create a platform channel (administrator-level step).
 * 2. Onboard a seller to own/catalog the product.
 * 3. Register a product for this seller.
 * 4. Assign the product to the channel.
 * 5. Retrieve the assignment by its ID using the API.
 * 6. Assert all critical fields match the assignment and the GET returns the
 *    correct record.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_retrieve_channel_assignment_detail_for_existing_assignment(
  connection: api.IConnection,
) {
  // 1. Create a new channel (as administrator)
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create a seller entity
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

  // 3. Create a new product for the seller.
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        // description/main_thumbnail_uri are optional
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Assign the product to the channel (creates assignment record).
  const assignment =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
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

  // 5. Retrieve channel assignment details by ID
  const got =
    await api.functional.aimall_backend.seller.products.channelAssignments.at(
      connection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
      },
    );
  typia.assert(got);

  // 6. Validate the assignment detail fields
  TestValidator.equals("channel assignment id matches")(got.id)(assignment.id);
  TestValidator.equals("assigned product matches")(got.product_id)(product.id);
  TestValidator.equals("assigned channel matches")(got.channel_id)(channel.id);
  TestValidator.equals("assigned_at timestamp matches")(got.assigned_at)(
    assignment.assigned_at,
  );
}
