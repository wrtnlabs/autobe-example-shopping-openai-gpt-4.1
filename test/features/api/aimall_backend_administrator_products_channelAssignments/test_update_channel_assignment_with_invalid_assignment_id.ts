import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate error response when updating a channel assignment with an invalid or
 * nonexistent channelAssignmentId.
 *
 * This test ensures that the API does not allow a channel assignment update
 * using a fake, nonexistent channelAssignmentId, even when product and channel
 * are valid. It validates the system's ability to reject updates for resources
 * that do not exist and to surface proper business error/404 codes for such
 * cases.
 *
 * Steps:
 *
 * 1. Create a seller to own the product
 * 2. Create a product resource belonging to that seller (category_id can be
 *    random/fake uuid because actual categories are not managed here)
 * 3. Create a channel resource
 * 4. Attempt to update a channel assignment for this product, but use a random
 *    UUID for the channelAssignmentId (never assigned in the setup)
 * 5. API is expected to return error (404 or business error indicating record not
 *    found)
 *
 * This test does NOT assume any valid assignment exists or pre-linking – it
 * only validates the API's error response to use of an unknown assignment ID.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_update_channel_assignment_with_invalid_assignment_id(
  connection: api.IConnection,
) {
  // 1. Create seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create product for that seller
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

  // 3. Create a channel (assignment link is not created, we want to update a non-existent assignment)
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

  // 4. Attempt to update channel assignment with a random, invalid assignmentId
  const invalidAssignmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should throw error when updating channel assignment with invalid channelAssignmentId",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.channelAssignments.update(
      connection,
      {
        productId: product.id,
        channelAssignmentId: invalidAssignmentId,
        body: {
          assigned_at: new Date().toISOString(),
        } satisfies IAimallBackendChannelAssignment.IUpdate,
      },
    );
  });
}
