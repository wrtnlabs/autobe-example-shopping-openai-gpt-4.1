import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Test graceful failure of deleting a nonexistent channel assignment as an
 * administrator.
 *
 * This test validates the system's error handling when attempting to delete a
 * product-channel assignment that does not exist. It ensures that the API
 * returns the appropriate error (404 Not Found or business key error) and does
 * not impact other channel assignments linked to the product.
 *
 * Step-by-step process:
 *
 * 1. Create a new seller through the administrator sellers API.
 * 2. Create a test product for the seller through the administrator products API.
 * 3. Create a new channel through the administrator channels API.
 * 4. (Assignment creation for product+channel is not exposed in the SDK, so
 *    skipped.)
 * 5. Attempt to DELETE with a random (fake) channelAssignmentId that does not
 *    exist. Expect error.
 * 6. (No GET/list method to verify channel assignments left, so skipped.)
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_eraseByProductidAndChannelassignmentid(
  connection: api.IConnection,
) {
  // 1. Create a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a test product for the seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.paragraph()(),
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
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph()(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 4. There is no API provided to create a channel assignment between product & channel, so skip.

  // 5. Attempt to delete a non-existent channel assignment (random channelAssignmentId).
  await TestValidator.error(
    "Delete nonexistent channel assignment should fail",
  )(() =>
    api.functional.aimall_backend.administrator.products.channelAssignments.erase(
      connection,
      {
        productId: product.id,
        channelAssignmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );

  // 6. Cannot check remaining assignments as there is no GET/list API, so skip.
}
