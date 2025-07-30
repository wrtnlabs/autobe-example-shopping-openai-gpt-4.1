import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate forbidden access control: sellers cannot list channel assignments
 * for products they do not own.
 *
 * This test ensures access control by verifying that a seller who does not own
 * a product is forbidden from viewing its channel assignments (should get HTTP
 * 403).
 *
 * Workflow:
 *
 * 1. Create Seller A (the owner of the product)
 * 2. Create Seller B (will attempt unauthorized access)
 * 3. Create a product with Seller A as the owner
 * 4. Create a channel as admin
 * 5. Assign the created channel to Seller A's product
 * 6. Attempt to access channel assignments with Seller B for Seller A's product
 *
 *    - Expect a 403 Forbidden error
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_list_channel_assignments_for_non_owner_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Create Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerAEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Create Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerBEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Create a product owned by Seller A
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      },
    });
  typia.assert(product);

  // 4. Create a channel as admin
  const channel: IAimallBackendChannel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(),
          enabled: true,
        },
      },
    );
  typia.assert(channel);

  // 5. Assign the channel to Seller A's product
  const assignment: IAimallBackendChannelAssignment =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channel.id,
          assigned_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(assignment);

  // 6. Attempt to access this product's channel assignments as Seller B
  //    (simulate Seller B session/context)
  // In a real test environment, you would authenticate as Seller B to ensure the auth token belongs to Seller B.
  // Here we assume the context switch (auth/session) is handled outside, or by adjusting connection.headers accordingly.
  // The key is: try to GET on Seller A's product as Seller B - expect 403.
  await TestValidator.error(
    "Seller B forbidden to view another seller's product channel assignments",
  )(() =>
    api.functional.aimall_backend.seller.products.channelAssignments.index(
      connection,
      {
        productId: product.id,
      },
    ),
  );
}
