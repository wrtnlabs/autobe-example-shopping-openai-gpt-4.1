import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Validate error handling when fetching a non-existent channel assignment
 * detail for a product as administrator.
 *
 * Ensures the system responds with a not found (404) or suitable error when
 * attempting to retrieve a channel assignment for a valid product but with a
 * channelAssignmentId that does not exist or was never assigned.
 *
 * Steps:
 *
 * 1. Create a product as an administrator to ensure a valid context for productId.
 * 2. Attempt to fetch channel assignment detail using a random non-existent
 *    assignment ID for this product.
 * 3. Assert that an error is thrown (404 or similar) and the system does not
 *    return a resource.
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_admin_retrieve_channel_assignment_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Create a product as administrator to establish valid product context
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Attempt to fetch a channel assignment using a non-existent assignment ID
  const nonExistentAssignmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should fail to fetch non-existent channel assignment",
  )(() =>
    api.functional.aimall_backend.administrator.products.channelAssignments.at(
      connection,
      {
        productId: product.id,
        channelAssignmentId: nonExistentAssignmentId,
      },
    ),
  );
}
