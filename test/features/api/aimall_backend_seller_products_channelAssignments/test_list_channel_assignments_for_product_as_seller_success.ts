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
 * Validates that a seller can successfully retrieve the list of all channel
 * assignments for one of its own products.
 *
 * This test exercises the workflow:
 *
 * 1. Create a new seller account
 * 2. Create multiple channels
 * 3. Create a product owned by the seller
 * 4. Assign the product to each channel
 * 5. Retrieve the channel assignment list for the product as the seller
 * 6. Validate that each assignment is properly listed
 *
 * The administrator context is used for both seller/channel creation, and since
 * the API set lacks explicit authentication endpoints, all operations use the
 * test system connection/session. Product creation uses a random UUID for
 * category_id.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_index(
  connection: api.IConnection,
) {
  // 1. Create a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: RandomGenerator.alphabets(7) + "@test.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create two channels
  const channels: IAimallBackendChannel[] = await ArrayUtil.asyncRepeat(2)(
    async () => {
      const channel =
        await api.functional.aimall_backend.administrator.channels.create(
          connection,
          {
            body: {
              code: RandomGenerator.alphabets(5).toUpperCase(),
              name: RandomGenerator.name(),
              enabled: true,
            } satisfies IAimallBackendChannel.ICreate,
          },
        );
      typia.assert(channel);
      return channel;
    },
  );

  // 3. Create product under this seller
  const product = await api.functional.aimall_backend.seller.products.create(
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

  // 4. Assign product to each channel
  const assignments: IAimallBackendChannelAssignment[] =
    await ArrayUtil.asyncMap(channels)(async (channel) => {
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
      return assignment;
    });

  // 5. List channel assignments for the product
  const result =
    await api.functional.aimall_backend.seller.products.channelAssignments.index(
      connection,
      {
        productId: product.id,
      },
    );
  typia.assert(result);

  // 6. Validate: all returned assignments match what was created
  TestValidator.equals("assignment count matches")(result.data.length)(
    assignments.length,
  );
  const createdIds = assignments.map((a) => a.id).sort();
  const listedIds = result.data.map((a) => a.id).sort();
  TestValidator.equals("all assignment ids present")(listedIds)(createdIds);
  for (const a of assignments) {
    const found = result.data.find((r) => r.id === a.id);
    TestValidator.predicate(`assignment ${a.id} returned`)(!!found);
    if (found) {
      TestValidator.equals("product_id matches")(found.product_id)(
        a.product_id,
      );
      TestValidator.equals("channel_id matches")(found.channel_id)(
        a.channel_id,
      );
      TestValidator.equals("assigned_at matches")(found.assigned_at)(
        a.assigned_at,
      );
    }
  }
}
