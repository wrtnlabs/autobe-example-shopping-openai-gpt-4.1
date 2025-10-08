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
 * Validate that a seller can update their own SKU's basic fields (name, price,
 * status) for a product they own. Ensure correct workflow setup and property
 * changes.
 *
 * 1. Register a new seller account (for isolation & context)
 * 2. Admin creates a new product category
 * 3. Admin creates a new role (for proper seller referencing)
 * 4. Seller creates a new product under the above category
 * 5. Seller creates a new SKU for the product
 * 6. Seller updates the SKU: change name, price, and status to 'inactive'
 * 7. Verify SKU fields were updated correctly (name, price, status)
 * 8. Assert unchanged properties remain as before and 'updated_at' was refreshed
 */
export async function test_api_seller_update_sku_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(sellerAuth);

  // 2. Admin creates product category
  const categoryCreate = {
    name_ko: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreate,
    });
  typia.assert(category);

  // 3. Admin creates new role ("SELLER")
  const roleCreate = {
    role_name: "SELLER",
    description: "E-commerce seller role with product catalog access",
  } satisfies IShoppingMallRole.ICreate;
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: roleCreate,
    });
  typia.assert(role);

  // 4. Seller creates product under their account
  const productCreate = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 12,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 5. Seller creates SKU
  const skuCreate = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    price: 12900,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 6. Update SKU fields - change name, price, and set status to 'inactive'
  const newName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const newPrice = sku.price + 4950;
  const updateBody = {
    name: newName,
    price: newPrice,
    status: "inactive",
  } satisfies IShoppingMallProductSku.IUpdate;
  const updatedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: updateBody,
    });
  typia.assert(updatedSku);

  // 7. Assert SKU fields changed as expected
  TestValidator.equals("sku name updated", updatedSku.name, newName);
  TestValidator.equals("sku price updated", updatedSku.price, newPrice);
  TestValidator.equals("sku status updated", updatedSku.status, "inactive");

  // 8. Assert id stays the same and updated_at is changed
  TestValidator.equals("sku id remains unchanged", updatedSku.id, sku.id);
  TestValidator.notEquals(
    "sku updated_at changed",
    updatedSku.updated_at,
    sku.updated_at,
  );

  // 9. Assert unchanged fields remain the same
  TestValidator.equals("sku_code unchanged", updatedSku.sku_code, sku.sku_code);
  TestValidator.equals(
    "product id unchanged",
    updatedSku.shopping_mall_product_id,
    sku.shopping_mall_product_id,
  );
}
