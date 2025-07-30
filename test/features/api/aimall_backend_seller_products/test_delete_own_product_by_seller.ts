import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Test permanent deletion of a product by its owner seller.
 *
 * Business context: Tests that a seller can hard-delete their own product via
 * the DELETE endpoint. This involves creating a new seller (via the admin API),
 * creating a product assigned to that seller, and then hard-deleting said
 * product. Verifies that the correct productId removes the product permanently
 * and satisfies business rules for non-reversible deletion. Existence checks
 * after delete are omitted as the API lacks a list/read function.
 *
 * Steps:
 *
 * 1. Create a seller (as admin).
 * 2. Create a product owned by that seller.
 * 3. Permanently delete the product by its productId as the owner seller.
 */
export async function test_api_aimall_backend_seller_products_test_delete_own_product_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a seller using admin privileges
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a product owned by this seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(), // Assumed valid category for test purposes
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Permanently delete the product by ID as its owner
  await api.functional.aimall_backend.seller.products.erase(connection, {
    productId: product.id,
  });
}
