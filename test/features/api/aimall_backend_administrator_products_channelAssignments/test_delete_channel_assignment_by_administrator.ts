import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Test that an administrator can delete a product-channel assignment.
 *
 * Business context: This test ensures that only administrators (with full
 * rights) can remove a channel assignment for any product. The workflow
 * simulates realistic admin behavior: a seller, product, channel, and
 * assignment are set up, the assignment is deleted, and post-conditions are
 * thoroughly validated. Since there’s no SDK to list product-channel
 * assignments or audit logs, deletion is validated by error on repeat deletion
 * call and ensuring hard-deletion behavior (assignment cannot be deleted
 * again).
 *
 * Steps:
 *
 * 1. Create a seller.
 * 2. Create a product for the seller.
 * 3. Create a channel.
 * 4. Assign the product to the channel (create product-channel assignment) and
 *    capture returned assignment.
 * 5. Perform the delete as admin using assignment/product ids.
 * 6. Attempt to delete the assignment again to verify it is already removed
 *    (should result in error).
 * 7. (Side effect) While listing of assignments and audit log is not available in
 *    the given SDK, ensure assignment has been fully deleted.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_delete(
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
          status: "approved", // Assuming typical onboarding
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for the seller
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
          name: RandomGenerator.name(),
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

  // 5. Perform the delete as administrator
  await api.functional.aimall_backend.administrator.products.channelAssignments.erase(
    connection,
    {
      productId: product.id,
      channelAssignmentId: assignment.id,
    },
  );

  // 6. Attempt to delete the assignment again should result in an error (proves it has been deleted)
  await TestValidator.error("second delete should fail")(() =>
    api.functional.aimall_backend.administrator.products.channelAssignments.erase(
      connection,
      {
        productId: product.id,
        channelAssignmentId: assignment.id,
      },
    ),
  );

  // 7. Side effect: no API to confirm removal/list/audit, thus this proves deletion occurred
}
