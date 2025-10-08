import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of a product SKU as public (guest):
 *
 * - Ensures only active SKUs are visible
 * - Validates detailed properties
 * - Tests error for non-existent and mismatched SKU
 */
export async function test_api_product_sku_retrieval_by_public(
  connection: api.IConnection,
) {
  // 1. Create category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        description_ko: RandomGenerator.paragraph({ sentences: 3 }),
        description_en: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 2. Create seller role (if not yet does not matter, just to follow dependency)
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Seller role for product management.",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 3. Register a seller (join)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNumber = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "testPw1!",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      business_registration_number: sellerRegNumber,
      kyc_document_uri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const sellerConn: api.IConnection = { ...connection, headers: {} };
  // sellerConn acts as the authenticated context for seller-created entries
  await api.functional.auth.seller.join(sellerConn, {
    body: {
      email: sellerEmail,
      password: "testPw1!",
      business_name: seller.business_name,
      contact_name: seller.contact_name,
      phone: seller.phone,
      business_registration_number: sellerRegNumber,
      kyc_document_uri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });

  // 4. Create a product as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConn, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Create an SKU under this product as seller
  const skuCreate = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    price: Math.floor(Math.random() * 100000) + 1000,
    status: "active",
    main_image_url: null,
    low_stock_threshold: 10,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(sellerConn, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 6. Retrieve SKU as public (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const retrieved: IShoppingMallProductSku =
    await api.functional.shoppingMall.products.skus.at(unauthConn, {
      productId: product.id,
      skuId: sku.id,
    });
  typia.assert(retrieved);

  TestValidator.equals("retrieved SKU id matches", retrieved.id, sku.id);
  TestValidator.equals(
    "retrieved SKU belongs to correct product",
    retrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "retrieved SKU code matches",
    retrieved.sku_code,
    skuCreate.sku_code,
  );
  TestValidator.equals(
    "retrieved SKU name matches",
    retrieved.name,
    skuCreate.name,
  );
  TestValidator.equals(
    "retrieved SKU price matches",
    retrieved.price,
    skuCreate.price,
  );
  TestValidator.equals(
    "retrieved SKU status matches",
    retrieved.status,
    skuCreate.status,
  );
  TestValidator.equals(
    "retrieved SKU main image url",
    retrieved.main_image_url,
    null,
  );
  TestValidator.equals(
    "retrieved low_stock_threshold matches",
    retrieved.low_stock_threshold,
    skuCreate.low_stock_threshold,
  );

  // 7-a. Error: Fetch a non-existent SKU
  await TestValidator.error(
    "retrieving non-existent SKU should fail",
    async () => {
      await api.functional.shoppingMall.products.skus.at(unauthConn, {
        productId: product.id,
        skuId: typia.random<string & tags.Format<"uuid">>(), // random UUID should not exist
      });
    },
  );

  // 7-b. Error: Fetch a SKU with wrong productId (mismatched parent)
  const bogusProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving SKU with mismatching productId should fail",
    async () => {
      await api.functional.shoppingMall.products.skus.at(unauthConn, {
        productId: bogusProductId,
        skuId: sku.id,
      });
    },
  );
}
