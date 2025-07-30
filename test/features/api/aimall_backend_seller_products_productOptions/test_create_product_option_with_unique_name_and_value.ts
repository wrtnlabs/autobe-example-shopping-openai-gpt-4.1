import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * E2E test for creating a product option with a unique name and value for a
 * seller-owned product.
 *
 * This test verifies the entire workflow:
 *
 * 1. Creating a seller account (administrator privileges)
 * 2. Creating a product under that seller
 * 3. Adding a unique product option (e.g., color or size) to the product
 * 4. Verifying that the product option is successfully created, contains all
 *    expected fields, is linked to the correct product, and matches all
 *    relevant validations
 *
 * The option listing/query step is omitted as it is unimplementable with
 * current API surface.
 */
export async function test_api_aimall_backend_seller_products_productOptions_test_create_product_option_with_unique_name_and_value(
  connection: api.IConnection,
) {
  // 1. Create a seller (administrator role)
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(12),
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
  TestValidator.equals("seller business_name")(seller.business_name)(
    sellerInput.business_name,
  );
  TestValidator.equals("seller email")(seller.email)(sellerInput.email);
  TestValidator.equals("seller contact_phone")(seller.contact_phone)(
    sellerInput.contact_phone,
  );
  TestValidator.equals("seller status")(seller.status)(sellerInput.status);

  // 2. Create a product for this seller
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: categoryId,
    seller_id: seller.id,
    title: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph()(),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  TestValidator.equals("product.seller_id linkage")(product.seller_id)(
    seller.id,
  );
  TestValidator.equals("product.category_id linkage")(product.category_id)(
    categoryId,
  );

  // 3. Create a product option (unique name/value per product_id)
  const optionInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: "Color",
    value: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
  };
  const option =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);
  TestValidator.equals("option.product_id linkage")(option.product_id)(
    product.id,
  );
  TestValidator.equals("option.name")(option.name)(optionInput.name);
  TestValidator.equals("option.value")(option.value)(optionInput.value);
}
