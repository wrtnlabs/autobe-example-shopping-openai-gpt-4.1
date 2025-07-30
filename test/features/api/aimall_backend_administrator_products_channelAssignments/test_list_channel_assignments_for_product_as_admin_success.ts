import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Test successful retrieval of channel assignments for a product (admin role).
 *
 * This test verifies that an administrator can retrieve all channel assignments
 * for a given product. The workflow will:
 *
 * 1. Create a new channel as an administrator
 * 2. Create a new product as an administrator
 * 3. Assign the created product to the new channel
 * 4. List all channel assignments for that product, and ensure the created
 *    assignment appears This covers both the positive retrieval path and
 *    validates assignment connectivity.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_list_channel_assignments_for_product_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create channel
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

  // 2. Create product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Assign product to channel
  const assigned_at: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
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
  TestValidator.equals("product_id matches")(assignment.product_id)(product.id);
  TestValidator.equals("channel_id matches")(assignment.channel_id)(channel.id);

  // 4. List assignments for the product, ensuring assignment appears
  const list =
    await api.functional.aimall_backend.administrator.products.channelAssignments.index(
      connection,
      {
        productId: product.id,
      },
    );
  typia.assert(list);
  TestValidator.predicate("assignment is present")(
    list.data.some(
      (entry) =>
        entry.id === assignment.id &&
        entry.product_id === product.id &&
        entry.channel_id === channel.id,
    ),
  );
}
