import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that an administrator can fully delete a product from the catalog.
 *
 * This test ensures that:
 *
 * - A valid product, associated with a freshly created seller, can be hard
 *   deleted by an administrator
 * - All dependencies are correctly handled per cascade/orphan policies (implicit,
 *   as only core API is available)
 * - Only provided API functions and DTOs are used; the test is strictly scoped by
 *   available SDK/contracts
 *
 * Test steps:
 *
 * 1. Administrator creates a new seller for the product
 * 2. Administrator creates a new product under that seller
 * 3. Administrator deletes the product by productId (main test subject)
 *
 * - No result assertion is possible after deletion due to lack of product-fetch
 *   API in provided materials
 */
export async function test_api_aimall_backend_administrator_products_test_delete_any_product_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create a new seller as administrator
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a new product owned by this seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. Administrator deletes the product by productId
  await api.functional.aimall_backend.administrator.products.erase(connection, {
    productId: product.id,
  });
  // Void response, so no type assertion necessary
}
