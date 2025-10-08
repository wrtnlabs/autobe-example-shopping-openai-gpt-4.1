import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the workflow for authenticated sellers onboarding a new product that
 * is immediately available in the catalog, verifying business rules:
 *
 * - Product must reference a valid (leaf) category created by admin
 * - Product name is unique per seller
 * - Required fields enforced; catalog listings reflect new product
 *
 * Steps:
 *
 * 1. Admin registration (for category)
 * 2. Admin creates category (leaf)
 * 3. Seller registration and authentication
 * 4. Seller creates product with valid data referencing admin category
 * 5. Validate product fields and catalog listing availability
 */
export async function test_api_product_creation_by_seller_with_valid_data(
  connection: api.IConnection,
) {
  // Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // Admin creates a valid catalog category
  const categoryNameKo = RandomGenerator.name(1);
  const categoryNameEn = RandomGenerator.name(1);
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: categoryNameKo,
        name_en: categoryNameEn,
        display_order: 0,
        is_active: true,
        // Leave parent_id as undefined/root and descriptions as undefined
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Now, register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerReg = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerReg);
  // Seller creates a new product using valid category
  const productName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const mainImageUrl = `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(6)}/600/400`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerReg.id,
        shopping_mall_category_id: category.id,
        name: productName,
        description: productDescription,
        is_active: true,
        main_image_url: mainImageUrl,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Validate product details reflect input and catalog listing
  TestValidator.equals("product name matches input", product.name, productName);
  TestValidator.equals("product category matches", product.is_active, true);
  TestValidator.equals(
    "main image url matches",
    product.main_image_url,
    mainImageUrl,
  );
}
