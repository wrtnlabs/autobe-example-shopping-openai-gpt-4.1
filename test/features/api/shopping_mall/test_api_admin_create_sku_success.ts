import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that an admin can successfully create a new SKU for an existing
 * product.
 *
 * Business validations:
 *
 * - SKU code is unique for the product
 * - Price must be positive
 * - Status and option values must be valid
 * - Inventory and all required fields set correctly
 *
 * Workflow:
 *
 * 1. Join as admin and authenticate
 * 2. Create a category
 * 3. Create a product under the new category
 * 4. Submit a valid SKU creation to the product
 * 5. Assert response: all SKU fields populated, and match
 */
export async function test_api_admin_create_sku_success(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Create category
  const categoryReq = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies Partial<IShoppingMallCategory.ICreate>;
  // Fill required (parent_id, description_ko/en are optional)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        ...categoryReq,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create product under category
  const productReq = {
    shopping_mall_seller_id: adminJoin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productReq,
    });
  typia.assert(product);

  // 4. Create SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuReq = {
    sku_code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: 10000 + Math.floor(Math.random() * 9000),
    status: "active",
    low_stock_threshold: 3,
    main_image_url: null,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: skuReq,
    });
  typia.assert(sku);

  // 5. Assertions
  TestValidator.equals(
    "SKU product id matches created product",
    sku.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("SKU code matches", sku.sku_code, skuReq.sku_code);
  TestValidator.equals("SKU price matches", sku.price, skuReq.price);
  TestValidator.equals("SKU name matches", sku.name, skuReq.name);
  TestValidator.equals("SKU status matches", sku.status, skuReq.status);
  TestValidator.equals(
    "SKU low_stock_threshold matches",
    sku.low_stock_threshold,
    skuReq.low_stock_threshold,
  );
  TestValidator.equals("SKU main_image_url is null", sku.main_image_url, null);
  TestValidator.predicate(
    "SKU created_at is string",
    typeof sku.created_at === "string",
  );
  TestValidator.predicate(
    "SKU updated_at is string",
    typeof sku.updated_at === "string",
  );
}
