import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error response when using invalid filter parameters for channel
 * assignment search as a seller.
 *
 * This test ensures that the backend rejects filtering requests for a product's
 * channel assignments when provided with filter keys or values not allowed by
 * the API spec. Typical invalid parameters include unknown keys (e.g.,
 * "channelId", which does not exist), or values that are not conformant to the
 * expected type (e.g., string instead of integer for page/limit, or non-uuid
 * format for valid keys).
 *
 * Test Steps:
 *
 * 1. Register a new seller as setup.
 * 2. Create a new product under this seller using valid category and details.
 * 3. Attempt to search for channel assignments via PATCH
 *    /aimall-backend/seller/products/{productId}/channelAssignments with
 *    clearly invalid filter body options:
 *
 *    - An unsupported key (e.g., "channelId": "not-a-uuid")
 *    - Or wrong value types for "page" or "limit"
 * 4. Assert that each attempt returns an error (422 or similar), and no data is
 *    yielded.
 * 5. Confirm that valid requests with allowed keys and types succeed for
 *    completeness.
 */
export async function test_api_aimall_backend_test_search_channel_assignments_invalid_filter_as_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
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

  // 2. Create product for the seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        seller_id: seller.id,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3.1. Attempt search with unsupported key "channelId"
  await TestValidator.error("invalid filter: unsupported key")(() =>
    api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: { channelId: "not-a-uuid" } as any, // purposely invalid as API spec does not allow this key
      },
    ),
  );

  // 3.2. Attempt search with wrong value type for page
  await TestValidator.error("invalid filter: wrong page value type")(() =>
    api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: { page: "not-an-integer" as any },
      },
    ),
  );

  // 3.3. Attempt search with wrong value type for limit
  await TestValidator.error("invalid filter: wrong limit value type")(() =>
    api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: { limit: "should-be-integer" as any },
      },
    ),
  );

  // 4. Confirm valid use yields no error
  const validResult =
    await api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(validResult);
}
