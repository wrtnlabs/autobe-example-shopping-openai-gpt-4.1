import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Test administrator product update API for proper enforcement of duplicate
 * title constraint.
 *
 * Validates that an administrator updating a product title to another existing
 * title under the same seller is rejected by the backend with a validation
 * error, enforcing uniqueness rules.
 *
 * Business context: Sellers may have multiple products but titles under the
 * same seller must be unique.
 *
 * Steps:
 *
 * 1. Create a seller entity for setup.
 * 2. Create Product A with title "Unique Title A" for this seller.
 * 3. Create Product B with a different title "Unique Title B" for the same seller.
 * 4. As administrator, attempt to update Product B's title via API to a duplicate
 *    value (Product A's title).
 * 5. Validate the API call returns an error and does not update Product B's data.
 *
 * Note: Since current API set does not support explicit Product GET/read,
 * post-error state check is omitted.
 */
export async function test_api_aimall_backend_administrator_products_test_update_product_with_duplicate_title_for_same_seller_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create seller for product ownership
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create Product A with unique title
  const productA = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: "Unique Title A",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(productA);

  // 3. Create Product B with another unique title
  const productB = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: productA.category_id,
        seller_id: seller.id,
        title: "Unique Title B",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(productB);

  // 4. Attempt to update Product B's title to duplicate value using admin update API
  await TestValidator.error("duplicate product title update not allowed")(() =>
    api.functional.aimall_backend.administrator.products.update(connection, {
      productId: productB.id,
      body: {
        title: productA.title,
      } satisfies IAimallBackendProduct.IUpdate,
    }),
  );
  // 5. Data verification of ProductB is omitted (no GET/read by id endpoint available).
}
