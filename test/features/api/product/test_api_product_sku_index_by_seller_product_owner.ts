import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can list, search, and filter SKUs for their own
 * product after registration and resource setup.
 *
 * Steps:
 *
 * 1. Register seller account with required business and contact fields
 * 2. Create a new product category (admin action)
 * 3. Create a new product assigned to that category for the seller
 * 4. Index/search/filter the list of SKUs for the created product
 * 5. Validate response schema and pagination structure
 */
export async function test_api_product_sku_index_by_seller_product_owner(
  connection: api.IConnection,
) {
  // Step 1: Register seller
  const seller_join_body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: seller_join_body,
  });
  typia.assert(seller);

  // Step 2: Create product category (admin)
  const category_body = {
    name_ko: RandomGenerator.paragraph({ sentences: 1 }),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: category_body },
  );
  typia.assert(category);

  // Step 3: Seller creates product
  const product_body = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: product_body },
  );
  typia.assert(product);

  // Step 4: List/search/filter SKUs for the product
  const sku_query = {} satisfies IShoppingMallProductSku.IRequest;
  const sku_page = await api.functional.shoppingMall.seller.products.skus.index(
    connection,
    {
      productId: product.id,
      body: sku_query,
    },
  );
  typia.assert(sku_page);

  // Step 5: Validate SKU records match own product (if any)
  for (const sku of sku_page.data) {
    TestValidator.equals(
      "SKU belongs to created product",
      sku.shopping_mall_product_id,
      product.id,
    );
  }
  TestValidator.equals(
    "pagination current page is 0",
    sku_page.pagination.current,
    0,
  );
}
