import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate that a seller can successfully delete a channel assignment for their
 * own product.
 *
 * This end-to-end test exercises the following business workflow:
 *
 * 1. Provision a new seller (administrator privilege)
 * 2. Provision a channel (administrator privilege)
 * 3. Create a product tied to the seller (administrator privilege)
 * 4. Assign the product to the channel (administrator privilege)
 * 5. As the seller, delete that channel assignment link (core test)
 * 6. (If an assignment query API existed, verify removal—but none is in SDK, so
 *    skipped)
 *
 * This test demonstrates that a seller can remove or "unlink" their product
 * from a sales channel via the correct API, and ensures type and business
 * correctness up to deletion.
 *
 * (NOTE: Audit log and assignment post-delete verification are omitted: they
 * require APIs not present in the working set.)
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_delete_channel_assignment_with_valid_id_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a seller as administrator
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

  // 2. Create a channel as administrator
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a product belonging to the seller as administrator
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

  // 4. Assign product to channel as administrator
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

  // 5. Delete the channel assignment as the seller
  await api.functional.aimall_backend.seller.products.channelAssignments.erase(
    connection,
    {
      productId: product.id,
      channelAssignmentId: assignment.id,
    },
  );

  // 6. No post-deletion verification APIs are available in the current SDK, so further validation is omitted.
}
