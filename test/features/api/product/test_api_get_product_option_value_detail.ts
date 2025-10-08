import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E: Retrieve detailed info for a specific product option value.
 *
 * This test validates that customers (unauthenticated/public endpoint) can
 * correctly retrieve product option value details by productId, optionId, and
 * valueId.
 *
 * Steps:
 *
 * 1. Admin registers (for creating categories/roles).
 * 2. Admin creates a category.
 * 3. Admin creates a seller role (if required).
 * 4. Seller registers (for product/option/value management).
 * 5. Seller creates a product under the category.
 * 6. Seller creates a product option (e.g. Size).
 * 7. Seller creates a product option value (e.g. XL).
 * 8. Retrieve the option value detail endpoint as a public/customer.
 * 9. Validate the value, display order, id match the inserted data.
 */
export async function test_api_get_product_option_value_detail(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPw1!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const catNameKo = RandomGenerator.paragraph({ sentences: 2 });
  const catNameEn = RandomGenerator.paragraph({ sentences: 2 });
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: catNameKo,
        name_en: catNameEn,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create SELLER role (ensure exist)
  const sellerRoleName = "SELLER";
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: sellerRoleName,
        description: "Role for seller accounts",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 4. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "sellerPw1!";
  const sellerBizName = RandomGenerator.paragraph({ sentences: 2 });
  const sellerContactName = RandomGenerator.name();
  const sellerPhone = RandomGenerator.mobile();
  const sellerBizRegNum = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: sellerBizName,
        contact_name: sellerContactName,
        phone: sellerPhone,
        business_registration_number: sellerBizRegNum,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 5. Seller creates product
  const prodName = RandomGenerator.paragraph({ sentences: 2 });
  const prodDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: prodName,
        description: prodDesc,
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Seller creates product option (e.g., size)
  const optionName = RandomGenerator.pick([
    "Size",
    "Color",
    RandomGenerator.name(1),
  ] as const);
  const optionOrder = 0;
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          display_order: optionOrder,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Seller creates product option value (e.g. XL)
  const valueText = RandomGenerator.pick([
    "XL",
    "L",
    "M",
    "Red",
    "Blue",
  ] as const);
  const valueOrder = 0;
  const value: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {
          value: valueText,
          display_order: valueOrder,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(value);

  // 8. Public retrieval: as customer (no auth required)
  const retrieved: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.products.options.values.at(connection, {
      productId: product.id,
      optionId: option.id,
      valueId: value.id,
    });
  typia.assert(retrieved);

  // 9. Validate returned fields match inserted value
  TestValidator.equals("option value id matches", retrieved.id, value.id);
  TestValidator.equals(
    "option linkage matches",
    retrieved.shopping_mall_product_option_id,
    option.id,
  );
  TestValidator.equals("option value text matches", retrieved.value, valueText);
  TestValidator.equals(
    "option value display order matches",
    retrieved.display_order,
    valueOrder,
  );
}
