import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can retrieve a paginated, filtered, and sorted list of
 * option values for a specific product option, with correct enforcement of
 * ownership and permission rules.
 *
 * Business context: E-commerce seller admin dashboard - sellers need to manage
 * product variant options (e.g., "Color" or "Size") and enumerate possible
 * values for SKUs (e.g., "Red", "Blue", "Large"). Only the seller owning the
 * product should be able to access/edit.
 *
 * Step-by-step process:
 *
 * 1. Authenticate as a seller by sign-up
 * 2. Admin: create the 'SELLER' role
 * 3. Admin: create a product category
 * 4. Seller: create a product in the above category
 * 5. Seller: create a product option (e.g. "Color") on the product
 * 6. Seller: create several option values (e.g. "Red", "Blue", ...), in shuffled
 *    order with different display_order
 * 7. Seller: retrieve a paginated subset of option values, filter by partial value
 *    keyword
 * 8. Validate: only seller's values are returned, filtering and pagination are
 *    correct, sort order works (asc/desc)
 * 9. Negative: try querying with another seller and confirm no access
 */
export async function test_api_product_option_value_pagination_and_filtering_by_seller(
  connection: api.IConnection,
) {
  // 1. Authenticate as a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessName = RandomGenerator.name();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "pw123$%",
        business_name: sellerBusinessName,
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Admin: create the SELLER role
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER", // By business rules
        description: "Role for platform sellers",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(sellerRole);

  // 3. Admin: create a leaf product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(1),
        name_en: RandomGenerator.name(1),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 4. Seller: create a product in the above category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Seller: create a product option
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: "Color",
          display_order: 0,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 6. Seller: create several option values (e.g. "Red", "Blue", ...)
  const values = [
    { value: "Red", display_order: 2 },
    { value: "Blue", display_order: 1 },
    { value: "Green", display_order: 3 },
    { value: "Yellow", display_order: 4 },
    { value: "Violet", display_order: 0 },
    { value: "Orange", display_order: 5 },
  ];

  const createdValues: IShoppingMallProductOptionValue[] = [];
  for (const val of values) {
    const created =
      await api.functional.shoppingMall.seller.products.options.values.create(
        connection,
        {
          productId: product.id,
          optionId: option.id,
          body: val satisfies IShoppingMallProductOptionValue.ICreate,
        },
      );
    typia.assert(created);
    createdValues.push(created);
  }

  // 7. Query: filter by keyword "Red", limit 2 per page, sorted asc by display_order
  const filterReq1 = {
    productId: product.id,
    optionId: option.id,
    body: {
      value: "Red",
      limit: 2,
      sort_by: "display_order",
      order: "asc",
    } satisfies IShoppingMallProductOptionValue.IRequest,
  };
  const filtered: IPageIShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.options.values.index(
      connection,
      filterReq1,
    );
  typia.assert(filtered);
  TestValidator.equals(
    "pagination returns at most 2 items",
    filtered.data.length,
    1,
  );
  TestValidator.equals(
    "the filtered result is 'Red' only",
    filtered.data[0].value,
    "Red",
  );

  // 8. Test: pagination works, cursor page 1, limit 3 (should get 3 ordered by display_order asc)
  const pageReq = {
    productId: product.id,
    optionId: option.id,
    body: {
      limit: 3,
      page: 1,
      sort_by: "display_order",
      order: "asc",
    } satisfies IShoppingMallProductOptionValue.IRequest,
  };
  const paged: IPageIShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.options.values.index(
      connection,
      pageReq,
    );
  typia.assert(paged);
  TestValidator.equals("pagination returns 3 items", paged.data.length, 3);
  const expectedOrdered = [...values]
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 3)
    .map((v) => v.value);
  TestValidator.equals(
    "items sorted by display_order asc",
    paged.data.map((x) => x.value),
    expectedOrdered,
  );
  TestValidator.predicate(
    "seller sees only their own values",
    paged.data.every(
      (row) => row.value && values.some((v) => v.value === row.value),
    ),
  );

  // 9. Test: sorting desc by display_order
  const descReq = {
    productId: product.id,
    optionId: option.id,
    body: {
      limit: 3,
      page: 1,
      sort_by: "display_order",
      order: "desc",
    } satisfies IShoppingMallProductOptionValue.IRequest,
  };
  const descRes: IPageIShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.options.values.index(
      connection,
      descReq,
    );
  typia.assert(descRes);
  const expectedDesc = [...values]
    .sort((a, b) => b.display_order - a.display_order)
    .slice(0, 3)
    .map((v) => v.value);
  TestValidator.equals(
    "items sorted by display_order desc",
    descRes.data.map((v) => v.value),
    expectedDesc,
  );

  // 10. Negative: another seller cannot see values
  const otherSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "xxx123$",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(otherSeller);

  // Switch auth context by using returned token (SDK handles this)
  const reqOther = {
    productId: product.id,
    optionId: option.id,
    body: {
      limit: 3,
    } satisfies IShoppingMallProductOptionValue.IRequest,
  };
  await TestValidator.error(
    "another seller cannot enumerate option values",
    async () => {
      await api.functional.shoppingMall.seller.products.options.values.index(
        connection,
        reqOther,
      );
    },
  );
}
