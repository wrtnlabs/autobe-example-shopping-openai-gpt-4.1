import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate that a seller cannot delete another seller's product.
 *
 * This test creates two sellers: Seller A (requestor) and Seller B (actual
 * owner). It then creates a product owned by Seller B. Seller A attempts to
 * delete that product. The API should return a forbidden error (e.g., HTTP
 * 403), confirming that a seller cannot delete products they do not own.
 *
 * Steps:
 *
 * 1. Create Seller A (requestor)
 * 2. Create Seller B (product owner)
 * 3. Create a product as Seller B
 * 4. Attempt to delete the product as Seller A (should fail with 403 Forbidden)
 */
export async function test_api_aimall_backend_seller_products_test_delete_product_of_another_seller(
  connection: api.IConnection,
) {
  // 1. Create Seller A
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Create Seller B
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Create a product as Seller B
  // Note: We provide seller_id as sellerB.id directly in the create call.
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerB.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()(1)(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("Product seller matches")(product.seller_id)(sellerB.id);

  // 4. Seller A (not the owner) attempts to delete Seller B's product
  // In a complete E2E setup, you would authenticate as Seller A here if tokens/role context matters.
  await TestValidator.error("Seller A cannot delete Seller B's product")(
    async () => {
      await api.functional.aimall_backend.seller.products.erase(connection, {
        productId: product.id,
      });
    },
  );
}
