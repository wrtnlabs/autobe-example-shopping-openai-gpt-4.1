import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that a seller cannot access a SKU belonging to another seller's
 * product.
 *
 * This test ensures strict access control on the SKU resource:
 *
 * - Seller A can create product and SKU.
 * - Seller B, a different seller, MUST NOT be able to view Seller A's SKU.
 * - Expect a 403 Forbidden or equivalent access-denied error.
 *
 * Steps:
 *
 * 1. Create Seller A (owner)
 * 2. Create Seller B (foreign seller)
 * 3. Seller A creates a product
 * 4. Seller A adds SKU to that product
 * 5. Simulate Seller B (switch connection identity if needed)
 * 6. Seller B attempts to fetch the SKU belonging to Seller A's product (must fail
 *    with forbidden)
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_attempts_to_get_foreign_sku_returns_forbidden(
  connection: api.IConnection,
) {
  // 1. Create Seller A (the owner of product/SKU)
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Create Seller B (unauthorized)
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates a product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.alphaNumeric(24),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller A adds a SKU
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(12),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Simulate Seller B (authorization context switches)
  // (Assume infra sets connection.headers/etc. to Seller B identity)

  // 6. Seller B tries to access Seller A's SKU; should throw/403 error
  await TestValidator.error("Seller B forbidden from accessing foreign SKU")(
    async () => {
      await api.functional.aimall_backend.seller.products.skus.at(connection, {
        productId: product.id,
        skuId: sku.id,
      });
    },
  );
}
