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
 * Validates that retrieving all product options for a selected productId
 * returns all options previously created for that product.
 *
 * This test ensures that when a valid productId is used, the GET endpoint
 * `/aimall-backend/products/{productId}/productOptions` returns all options
 * previously registered against that product (via admin POST endpoint), and
 * confirms that the returned records properly match the input name and value.
 * The test simulates the entire dependency chain: seller registration, product
 * registration, option creation, and finally listing, with appropriate business
 * and data assertions.
 *
 * Steps:
 *
 * 1. Register a new seller (to own the product).
 * 2. Create a new product under this seller (with a random valid categoryId).
 * 3. Attach at least one product option (distinct name/value, e.g. Color/Red).
 * 4. Retrieve product options for the product (GET endpoint with productId param).
 * 5. Assert that the response includes the options created above (name, value, and
 *    product_id compared for equivalence).
 * 6. Type-validate all API responses.
 */
export async function test_api_products_test_list_product_options_for_existing_product(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a new product associated with the seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
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

  // 3. Create a product option (e.g., Color: Red)
  const optionName = "Color";
  const optionValue = "Red";
  const productOptionInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: optionName,
    value: optionValue,
  };
  const option =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      { productId: product.id, body: productOptionInput },
    );
  typia.assert(option);

  // 4. Retrieve all options for the product by productId
  const page =
    await api.functional.aimall_backend.products.productOptions.index(
      connection,
      { productId: product.id },
    );
  typia.assert(page);

  // 5. Assert the created option appears in the returned data array
  const found = page.data.find(
    (item) => item.name === optionName && item.value === optionValue,
  );
  TestValidator.predicate("created option is included in returned options")(
    !!found,
  );
  TestValidator.equals("option product_id matches")(found?.product_id)(
    product.id,
  );
}
