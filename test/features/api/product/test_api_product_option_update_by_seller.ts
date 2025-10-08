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
 * Validate seller product option update functionality and authorization logic.
 *
 * This test covers the workflow in which a seller registers as a platform
 * seller, creates a dedicated product category, sets up a seller role, creates
 * a product, adds a product option, then updates that option. The test enforces
 * that only the authenticated seller can update their own product's option and
 * that option name uniqueness constraints are respected at the product level.
 * After updating, the change is validated by checking the returned data. Edge
 * case: Attempting to update the option with a duplicate name or from another
 * seller should result in a business logic error (negative assertion for
 * authorization and name uniqueness).
 */
export async function test_api_product_option_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Create admin-side product category (required for product creation)
  const categoryCreate = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);
  TestValidator.equals(
    "category name matches",
    category.name_ko,
    categoryCreate.name_ko,
  );

  // 2. Create admin-side seller role
  const sellerRoleCreate = {
    role_name: RandomGenerator.paragraph({ sentences: 1 }).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRole.ICreate;
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: sellerRoleCreate,
    });
  typia.assert(sellerRole);
  TestValidator.equals(
    "seller role name matches",
    sellerRole.role_name,
    sellerRoleCreate.role_name,
  );

  // 3. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);
  TestValidator.equals("seller email matches", sellerAuth.email, sellerEmail);

  // 4. Create a product as the seller
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);
  TestValidator.equals("product name matches", product.name, productBody.name);
  TestValidator.equals(
    "product seller matches",
    productBody.shopping_mall_seller_id,
    sellerAuth.id,
  );

  // 5. Add a product option
  const optionBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      { productId: product.id, body: optionBody },
    );
  typia.assert(option);
  TestValidator.equals("option name matches", option.name, optionBody.name);

  // 6. Update option: test updating name and display_order
  const updatedOptionBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 1,
  } satisfies IShoppingMallProductOption.IUpdate;
  const updatedOption: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.update(
      connection,
      { productId: product.id, optionId: option.id, body: updatedOptionBody },
    );
  typia.assert(updatedOption);
  TestValidator.equals(
    "updated option name matches",
    updatedOption.name,
    updatedOptionBody.name,
  );
  TestValidator.equals(
    "updated option order matches",
    updatedOption.display_order,
    updatedOptionBody.display_order,
  );

  // 7. Business rule: enforce uniqueness (can't set duplicate name for another option)
  // Add a second option with a unique name
  const option2Body = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 2,
  } satisfies IShoppingMallProductOption.ICreate;
  const option2: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      { productId: product.id, body: option2Body },
    );
  typia.assert(option2);
  // Try to update option2 with a name already used by updatedOption (should fail)
  await TestValidator.error(
    "updating option with duplicate name should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.options.update(
        connection,
        {
          productId: product.id,
          optionId: option2.id,
          body: {
            name: updatedOption.name,
          } satisfies IShoppingMallProductOption.IUpdate,
        },
      );
    },
  );

  // 8. Authorization: another seller cannot update original seller's option
  // Register a second seller
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2JoinBody = {
    email: seller2Email,
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller2Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2JoinBody,
    });
  typia.assert(seller2Auth);
  // Simulate login as seller2 (the SDK should switch tokens, so subsequent requests use seller2 context)
  // Now seller2 attempts to update seller1's option -- must fail authorization
  await TestValidator.error(
    "other seller cannot update this sellers option",
    async () => {
      await api.functional.shoppingMall.seller.products.options.update(
        connection,
        {
          productId: product.id,
          optionId: option.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IShoppingMallProductOption.IUpdate,
        },
      );
    },
  );
}
