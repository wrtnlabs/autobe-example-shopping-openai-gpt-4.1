import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * E2E test for assigning a product to a channel using
 * /aimall-backend/seller/products/{productId}/channelAssignments.
 *
 * This test ensures correct creation of a channel assignment, covering:
 *
 * - All prerequisites: channel, seller, product entities exist
 * - Successful assignment creation and business field validation
 * - Prevention of duplicate assignments (attempting repeated assignment throws)
 *
 * Steps:
 *
 * 1. Create a unique channel (simulate platform channel provisioning)
 * 2. Create a seller (simulate merchant onboarding)
 * 3. Create a product attached to the seller (simulate catalog insert)
 * 4. Assign the product to the created channel (test main function)
 * 5. Assert assignment is correct and response fields returned
 * 6. Attempt duplicate assignment (should fail)
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_create_channel_assignment_for_product_success(
  connection: api.IConnection,
) {
  // Step 1: Provision a new unique channel entity
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.paragraph()(3),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // Step 2: Register merchant (seller)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(7),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // Step 3: Register product for new seller
  // Category must be a valid uuid, so generate one for test
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 4: Assign product to channel
  const assignedAt = new Date().toISOString();
  const assignment =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
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
  TestValidator.equals("product assignment: product id")(assignment.product_id)(
    product.id,
  );
  TestValidator.equals("product assignment: channel id")(assignment.channel_id)(
    channel.id,
  );
  TestValidator.equals("product assignment: timestamp")(assignment.assigned_at)(
    assignedAt,
  );

  // Step 5: Attempt duplicate assignment (should fail)
  await TestValidator.error("Duplicate assignment must be rejected")(
    async () => {
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
    },
  );
}
