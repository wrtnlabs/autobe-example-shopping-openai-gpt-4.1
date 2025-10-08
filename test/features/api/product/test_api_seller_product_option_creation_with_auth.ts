import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller product option creation workflow and constraints.
 *
 * 1. Register and authenticate a new seller (includes legal info fields).
 * 2. Admin creates a category (required for product creation).
 * 3. Admin creates a new SELLER role for the platform.
 * 4. Seller creates a product in the new category.
 * 5. Seller creates a product option (success case).
 * 6. Attempt to create a product option with duplicate name (should fail).
 * 7. Attempt to create a product option with invalid schema values (should fail).
 */
export async function test_api_seller_product_option_creation_with_auth(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(10),
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        kyc_document_uri: null,
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Admin creates a category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        description_ko: RandomGenerator.paragraph({ sentences: 4 }),
        description_en: RandomGenerator.paragraph({ sentences: 4 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Admin creates a SELLER role
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Platform seller account role",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 4. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2, sentenceMin: 8 }),
        is_active: true,
        main_image_url: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Seller creates a product option (success case)
  const optionName = RandomGenerator.paragraph({ sentences: 1 });
  const optionDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          display_order: optionDisplayOrder,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);
  TestValidator.equals("option name matches", option.name, optionName);
  TestValidator.equals(
    "option display_order matches",
    option.display_order,
    optionDisplayOrder,
  );
  TestValidator.equals(
    "option associated with product",
    option.shopping_mall_product_id,
    product.id,
  );

  // 6. Create duplicate option, expect error
  await TestValidator.error(
    "duplicate product option name should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.options.create(
        connection,
        {
          productId: product.id,
          body: {
            name: optionName, // Same name
            display_order: optionDisplayOrder + 1, // Different order
          } satisfies IShoppingMallProductOption.ICreate,
        },
      );
    },
  );

  // 7. Invalid schema value test (blank name, negative display_order)
  await TestValidator.error(
    "blank option name should fail schema validation",
    async () => {
      await api.functional.shoppingMall.seller.products.options.create(
        connection,
        {
          productId: product.id,
          body: {
            name: "",
            display_order: 0,
          } satisfies IShoppingMallProductOption.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "negative display_order should fail schema validation",
    async () => {
      await api.functional.shoppingMall.seller.products.options.create(
        connection,
        {
          productId: product.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            display_order: -1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallProductOption.ICreate,
        },
      );
    },
  );
}
