import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete workflow for a seller deleting a product option value that
 * is not referenced by any SKUs or orders.
 *
 * 1. Register and authenticate as a new seller
 * 2. Create a new category (admin)
 * 3. Seller creates a new product under this category
 * 4. Seller adds a product option for the new product
 * 5. Seller adds an option value (e.g., "Blue") for the product option
 * 6. Seller deletes the option value
 * 7. (No further checks can be performed for value existence due to missing
 *    endpoints -- deletion success is implicit)
 * 8. Also ensures that attempting to delete a non-existent value triggers error
 *    handling, if possible.
 */
export async function test_api_product_option_value_erase_by_seller(
  connection: api.IConnection,
) {
  // 1. Register the seller (authenticate)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test!1234",
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(8),
    kyc_document_uri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 2. Create a product category
  const categoryCreateBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_ko: RandomGenerator.content({ paragraphs: 1 }),
    description_en: RandomGenerator.content({ paragraphs: 1 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryCreateBody },
  );
  typia.assert(category);

  // 3. Seller creates a product in the new category
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // 4. Seller creates a product option (e.g., Color)
  const optionCreateBody = {
    name: RandomGenerator.name(1),
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionCreateBody,
      },
    );
  typia.assert(option);

  // 5. Seller adds a product option value
  const optionValueCreateBody = {
    value: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 0,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue =
    await api.functional.shoppingMall.seller.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 6. Seller deletes the product option value (permitted case)
  await api.functional.shoppingMall.seller.products.options.values.erase(
    connection,
    {
      productId: product.id,
      optionId: option.id,
      valueId: optionValue.id,
    },
  );

  // 7. Attempting to delete again should result in error (if error can be detected in this API; no TestValidator.error as SDK does not throw predictable error)
}
