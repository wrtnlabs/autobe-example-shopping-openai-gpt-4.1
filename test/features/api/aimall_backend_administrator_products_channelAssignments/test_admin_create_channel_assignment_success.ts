import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate successful admin channel assignment for a product.
 *
 * This test ensures that an admin can assign a product to a channel. The
 * process requires:
 *
 * 1. Creating a channel (since channel must exist for assignment).
 * 2. Creating a product (since a product must exist to assign).
 * 3. Assigning that product to the channel via the assignment endpoint.
 * 4. Validating that the assignment response contains all proper fields and
 *    references (product_id, channel_id, time, etc.) with correct values,
 *    reflecting the established relationship.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_admin_create_channel_assignment_success(
  connection: api.IConnection,
) {
  // 1. Admin creates a new channel
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.alphabets(6),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 2. Admin creates a new product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.paragraph()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Assign product to the channel
  const assignInput = {
    product_id: product.id,
    channel_id: channel.id,
    assigned_at: new Date().toISOString(),
  } satisfies IAimallBackendChannelAssignment.ICreate;
  const assignment =
    await api.functional.aimall_backend.administrator.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: assignInput,
      },
    );
  typia.assert(assignment);

  // 4. Validate assignment output
  TestValidator.equals("product reference")(assignment.product_id)(product.id);
  TestValidator.equals("channel reference")(assignment.channel_id)(channel.id);
  TestValidator.predicate("assignment timestamp is ISO8601")(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/i.test(assignment.assigned_at),
  );
  TestValidator.equals("assignment id is uuid")(
    /^[0-9a-fA-F-]{36}$/i.test(assignment.id),
  )(true);
}
