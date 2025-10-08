import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the deletion of a product option (such as "Color" or "Size") by an
 * authenticated seller.
 *
 * Validates that a seller can delete a product option they created, provided it
 * is not being used by any SKU/variant. Since SKU creation and referencing are
 * not represented in the available APIs, this test only validates the positive
 * deletion scenario. Error condition for deleting an in-use option cannot be
 * implemented without an API to create referencing SKUs; this edge case is
 * noted but omitted in actual execution.
 *
 * Steps:
 *
 * 1. Register a new seller account and obtain its authorization.
 * 2. Create a new category via admin endpoint to attach products to.
 * 3. Create a product as the new seller under the category.
 * 4. Add a product option (e.g., "Color") to the product.
 * 5. Delete the created option.
 * 6. (Negative test skipped as SKU linking is unavailable.)
 */
export async function test_api_product_option_delete_by_seller_variant_management(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessNumber = RandomGenerator.alphabets(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: sellerBusinessNumber,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create product option
  const option =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(),
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 5. Delete product option
  await api.functional.shoppingMall.seller.products.options.erase(connection, {
    productId: product.id,
    optionId: option.id,
  });
}
