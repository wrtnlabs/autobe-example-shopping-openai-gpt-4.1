import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate retrieving product options for a product with no associated options.
 *
 * This test ensures that when a client requests the product option list for a
 * valid product that has not had any product option records created, the
 * endpoint correctly returns an empty array without error.
 *
 * Steps:
 *
 * 1. Register a new seller (prerequisite for creating products).
 * 2. Create a new product linked to that seller, but do not attach any product
 *    options.
 * 3. Call the product options list API for the new product.
 * 4. Assert that the returned list is empty (no option records).
 * 5. Validate the pagination fields behave as expected for empty lists.
 */
export async function test_api_aimall_backend_products_productOptions_test_list_options_for_product_with_no_options(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a new product with no options attached
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(), // Assume valid random
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Call product options index for the created product (expect empty list)
  const optionsPage =
    await api.functional.aimall_backend.products.productOptions.index(
      connection,
      {
        productId: product.id,
      },
    );
  typia.assert(optionsPage);

  // 4. Assert that the returned data array is empty
  TestValidator.equals("empty product option list")(optionsPage.data)([]);

  // 5. Optionally validate pagination returns zero for records/pages
  TestValidator.equals("zero records")(optionsPage.pagination.records)(0);
  TestValidator.equals("zero pages")(optionsPage.pagination.pages)(0);
}
