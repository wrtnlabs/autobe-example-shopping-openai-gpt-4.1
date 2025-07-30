import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate error handling when a seller attempts to delete a channel assignment
 * with an invalid (nonexistent) channelAssignmentId.
 *
 * This test ensures the API robustly rejects deletion attempts referencing
 * nonexistent channel assignments. The workflow:
 *
 * 1. Create a new seller account (administrator privilege).
 * 2. Create a new channel (administrator privilege).
 * 3. Create a new product linked to the seller (administrator privilege).
 * 4. As the seller, attempt to delete a channel assignment on the product using a
 *    random UUID (guaranteed nonexistent channelAssignmentId).
 * 5. Confirm that the response is a 404 or an error indicating resource not found
 *    (TestValidator.error usage), verifying strict not-found handling for bad
 *    references.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_delete_channel_assignment_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a seller (admin action)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a channel (admin action)
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph()(1),
          enabled: true,
        },
      },
    );
  typia.assert(channel);

  // 3. Create a product for the seller (admin action)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(2),
          description: RandomGenerator.content()()(),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Attempt to delete a channel assignment using a random (invalid) channelAssignmentId as seller
  await TestValidator.error(
    "Deleting a non-existent channel assignment should fail",
  )(async () => {
    await api.functional.aimall_backend.seller.products.channelAssignments.erase(
      connection,
      {
        productId: product.id,
        channelAssignmentId: typia.random<string & tags.Format<"uuid">>(), // random, guaranteed non-existent
      },
    );
  });
}
