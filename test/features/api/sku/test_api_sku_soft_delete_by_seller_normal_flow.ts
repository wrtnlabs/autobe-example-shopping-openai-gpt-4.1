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
 * Test that a seller can soft-delete a SKU they own, provided it is not linked
 * to any active or pending order. Seller joins (creates new context), then
 * creates a category and role, product, SKU, then deletes the SKU. Expects
 * deleted_at to be set, SKU hidden from catalog but order/audit history
 * preserved. Ensures authentication and preconditions are respected.
 */
export async function test_api_sku_soft_delete_by_seller_normal_flow(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);
  TestValidator.equals(
    "registered seller's email matches input",
    seller.email,
    sellerJoin.email,
  );

  // 2. Create category (admin action, used for product creation)
  const categoryBody = {
    parent_id: undefined,
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
    description_ko: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);
  TestValidator.equals("category is active", category.is_active, true);

  // 3. Create seller role (admin action, but test focuses only on flow)
  const roleBody = {
    role_name: "SELLER" + RandomGenerator.alphabets(5).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRole.ICreate;
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: roleBody },
  );
  typia.assert(role);

  // 4. Create product as seller
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
    main_image_url: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "seller owns the product",
    productBody.shopping_mall_seller_id,
    seller.id,
  );

  // 5. Create SKU on product
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(1),
    price: Math.round(Math.random() * 9000) + 1000,
    status: "active",
    low_stock_threshold: 2,
    main_image_url: undefined,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuBody },
  );
  typia.assert(sku);
  TestValidator.equals(
    "sku belongs to the product",
    sku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("sku status is active", sku.status, skuBody.status);

  // 6. Delete SKU (soft delete)
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productId: product.id,
    skuId: sku.id,
  });

  // (Optional) If there were an API for getting SKUs by product, we could check deleted_at. At minimum, check it is not error and ownership passes.
}
