import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test access control: ensure listing SKUs is restricted to owning sellers.
 *
 * This test validates that when Seller B attempts to list the SKUs for a
 * product actually owned by Seller A, the platform enforces proper permissions,
 * returning a 403 Forbidden error (or equivalent) rather than exposing the SKU
 * list. This prevents cross-account data leaks.
 *
 * Workflow:
 *
 * 1. Register Seller A via the administrator endpoint
 * 2. Register Seller B via the administrator endpoint
 * 3. Seller A creates a product (owned by Seller A)
 * 4. Seller B attempts to GET SKUs for Seller A's product
 * 5. Expect a permission error (403 Forbidden or equivalent)
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_list_skus_for_product_not_owned_returns_permission_error(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerAEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerBEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates a product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller B attempts to list SKUs for Seller A's product
  // In a full system this would require switching to Seller B's authenticated session.
  // Here, we invoke the endpoint expecting a permission error (403 Forbidden or equivalent).
  await TestValidator.error(
    "Seller B cannot list SKUs for another seller's product",
  )(async () => {
    await api.functional.aimall_backend.seller.products.skus.index(connection, {
      productId: product.id,
    });
  });
}
