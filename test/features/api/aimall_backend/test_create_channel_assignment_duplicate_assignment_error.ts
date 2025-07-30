import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate that assigning a product to the same channel twice throws a
 * uniqueness violation.
 *
 * This test ensures the platform enforces unique product-channel assignments
 * and prevents duplicates. Precondition: Seller, product, and channel all
 * exist.
 *
 * 1. Create a new channel for assignment, guaranteeing uniqueness via unique code.
 * 2. Create a new seller, provisioned as owner of the product.
 * 3. Create a new product belonging to the seller (populate required minimal
 *    fields).
 * 4. Assign the product to the channel for the first time (should succeed with
 *    response).
 * 5. Attempt to assign the product to same channel again with a new assigned_at
 *    (simulate concurrent/common API use). This must fail -- expect a 409
 *    conflict or other error confirming duplicate assignment cannot occur.
 * 6. Assert that the correct error is thrown during the second assignment attempt.
 */
export async function test_api_aimall_backend_test_create_channel_assignment_duplicate_assignment_error(
  connection: api.IConnection,
) {
  // 1. Create a new channel
  const uniqueCode: string = RandomGenerator.alphaNumeric(12);
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.paragraph()(1),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Create a new seller
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

  // 3. Create product owned by the seller (category_id is required; for test, generate random uuid)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(1),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Assign product to channel (first assignment - should succeed)
  const assigned_at: string = new Date().toISOString();
  const assignment =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at,
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Attempt duplicate assignment; must fail (simulate a new assigned_at)
  const assigned_at2: string = new Date(Date.now() + 1000).toISOString();
  await TestValidator.error("duplicate product-channel assignment must fail")(
    () =>
      api.functional.aimall_backend.seller.products.channelAssignments.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            channel_id: channel.id,
            assigned_at: assigned_at2,
          } satisfies IAimallBackendChannelAssignment.ICreate,
        },
      ),
  );
}
