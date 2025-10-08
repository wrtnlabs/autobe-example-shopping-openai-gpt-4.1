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
 * Validate that a seller can create a new product option value for a product
 * they own, covering the full prerequisite business flow.
 *
 * The steps are as follows:
 *
 * 1. Register an admin user.
 * 2. Create a product category (admin).
 * 3. Create a seller role (admin).
 * 4. Register a seller.
 * 5. Seller creates a product associated with the above category.
 * 6. Seller adds an option to that product (e.g., "Color").
 * 7. Seller adds a new option value to that product option (e.g., "Red").
 *
 * The test asserts that all ownership and uniqueness requirements are enforced
 * and that relationships are consistent throughout the flow.
 */
export async function test_api_product_option_value_creation_by_seller_complete_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass!1",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new product category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create the 'SELLER' role as admin
  const sellerRoleName = "SELLER";
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: sellerRoleName,
        description: "Role for authorized product sellers",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(sellerRole);

  // 4. Register a seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBRN = RandomGenerator.alphaNumeric(10);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass!1",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerBRN,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 5. Seller creates a product associated with the above category
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 1 });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: productName,
        description: productDescription,
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Seller creates an option for the product (e.g., Color)
  const optionName = "Color";
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 7. Seller adds a new value to the product option (e.g., Red)
  const valueText = "Red";
  const value: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.options.values.create(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: {
          value: valueText,
          display_order: 0,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(value);

  // Assert relationships and value property propagation
  TestValidator.equals(
    "optionId in value matches created option",
    value.shopping_mall_product_option_id,
    option.id,
  );
  TestValidator.equals("value field set as requested", value.value, valueText);
  TestValidator.predicate(
    "value id is a UUID",
    typeof value.id === "string" && value.id.length >= 32,
  );
}
