import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Test updating a product-channel assignment with an invalid
 * channelAssignmentId (not found scenario).
 *
 * Purpose: Ensure that attempting to update a channel assignment for a product
 * with an ID that does not exist or does not belong to the product results in a
 * not found (404) error.
 *
 * Business context: Sellers may attempt to update channel assignments for their
 * products, but referencing a non-existent or incorrect assignment should be
 * properly handled by the API with an appropriate error, preventing silent data
 * loss or accidental creation.
 *
 * Step-by-step process:
 *
 * 1. Create a valid seller using the administrator endpoint.
 * 2. Create a valid product for that seller.
 * 3. Attempt to update a channel assignment using a random (invalid)
 *    channelAssignmentId that does not exist.
 * 4. Validate that a 404 error (or equivalent not found error) is returned from
 *    the API.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_update_channel_assignment_not_found(
  connection: api.IConnection,
) {
  // 1. Create a valid seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a product for that seller (requires a valid category_id, so we use a random uuid)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. Try to update a channel assignment for this product with a random invalid channelAssignmentId
  const invalidChannelAssignmentId = typia.random<
    string & tags.Format<"uuid">
  >();
  const now = new Date().toISOString();
  await TestValidator.error(
    "should fail (404 Not Found) when updating nonexistent channel assignment",
  )(() =>
    api.functional.aimall_backend.seller.products.channelAssignments.update(
      connection,
      {
        productId: product.id,
        channelAssignmentId: invalidChannelAssignmentId,
        body: { assigned_at: now },
      },
    ),
  );
}
