import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Test API error response on detail fetch with non-existent
 * channelAssignmentId.
 *
 * Business context: Sellers may attempt to retrieve details of a
 * product-channel assignment that does not exist, which should result in a not
 * found (404) error.
 *
 * This test verifies that the API properly rejects requests for invalid or
 * non-existent assignment records under a real seller's product, returning the
 * correct error response (such as 404 not found).
 *
 * Step-by-step process:
 *
 * 1. Create a new seller via administrator endpoint.
 * 2. Create a new product for this seller.
 * 3. Attempt to GET product channelAssignment detail using a random (non-existent)
 *    channelAssignmentId for this productId.
 * 4. Validate: The response should throw or return an error (typically 404)
 *    indicating the channel assignment does not exist.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_retrieve_channel_assignment_detail_with_invalid_assignment_id(
  connection: api.IConnection,
) {
  // 1. Create a seller via admin endpoint
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for this seller
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

  // 3. Attempt to fetch channel assignment with a random (non-existent) channelAssignmentId
  const invalidChannelAssignmentId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Assert error (404 or not found)
  await TestValidator.error("should fail for non-existent channel assignment")(
    () =>
      api.functional.aimall_backend.seller.products.channelAssignments.at(
        connection,
        {
          productId: product.id,
          channelAssignmentId: invalidChannelAssignmentId,
        },
      ),
  );
}
