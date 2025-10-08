import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate public (unauthenticated) product option detail access for an active
 * product.
 *
 * 1. Register seller
 * 2. Register admin
 * 3. Admin creates a new product category
 * 4. Seller creates a new product assigned to that category
 * 5. Seller creates a product option for the product (e.g., "Color")
 * 6. Attempt to fetch the product option detail as a public (unauthenticated)
 *    client
 * 7. Validate the returned option detail matches expected and is visible (since
 *    product/option are active)
 */
export async function test_api_product_option_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // Token (seller) is now present in connection

  // 2. Register a new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // Token (admin) will be set in connection

  // 3. Admin creates product category
  const categoryInput = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryInput },
  );
  typia.assert(category);

  // 4. Seller creates a product within that category
  // Switch back to seller authentication
  await api.functional.auth.seller.join(connection, { body: sellerJoinInput });
  const productInput = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  // 5. Seller creates a product option
  const optionInput = {
    name: RandomGenerator.pick(["Color", "Size", "Material"] as const),
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);
  // 6. Call the public endpoint as "unauthenticated" (reset headers)
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const detail = await api.functional.shoppingMall.products.options.at(
    publicConn,
    {
      productId: product.id,
      optionId: option.id,
    },
  );
  typia.assert(detail);
  // 7. Assert returned detail matches created option values
  TestValidator.equals("product option id matches", detail.id, option.id);
  TestValidator.equals(
    "product id matches option's parent",
    detail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("option name matches", detail.name, optionInput.name);
  TestValidator.equals(
    "display order matches",
    detail.display_order,
    optionInput.display_order,
  );
}
