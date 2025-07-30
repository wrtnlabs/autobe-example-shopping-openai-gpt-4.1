import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";

/**
 * Attempt to assign a product to a non-existent channel and expect error.
 *
 * This test verifies that assigning a product to a non-existent (invalid)
 * channel returns an appropriate 400/404 error. It ensures backend referential
 * integrity and validation logic for channel assignments. Only valid sellers
 * and products are created; the channel_id is intentionally invalid.
 *
 * Steps:
 *
 * 1. Create a new seller with valid details using the administrator endpoint.
 * 2. Create a new product for that seller (with random category_id).
 * 3. Attempt to assign the product to a random/non-existent channel (random UUID).
 * 4. Validate that the API responds with an error (validation or FK error), as
 *    expected.
 */
export async function test_api_aimall_backend_seller_products_channelAssignments_test_create_channel_assignment_with_invalid_channel_id(
  connection: api.IConnection,
) {
  // 1. Create a valid seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(1),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a valid product for this seller (random category)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. Attempt to assign product to an invalid/non-existent channel
  const invalid_channel_id = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail for non-existent channel_id")(
    async () => {
      await api.functional.aimall_backend.seller.products.channelAssignments.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            channel_id: invalid_channel_id,
            assigned_at: new Date().toISOString(),
          },
        },
      );
    },
  );
}
