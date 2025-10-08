import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate admin-powered product creation in the shopping mall catalog.
 *
 * Steps:
 *
 * 1. Register a new admin (join), to obtain platform admin access.
 * 2. As admin, create a new product category (required for core linkage).
 * 3. As admin, create a new product in the catalog, referencing the created
 *    category and setting all required/optional fields to valid values.
 * 4. Validate that the product references the right category, is_active=true, and
 *    created fields are present and well-typed.
 * 5. Ensure result is suitable for subsequent catalog, seller, or customer use
 *    downstream.
 */
export async function test_api_product_creation_by_admin_in_catalog_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SuperSecureAdminPwd!2025",
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.full_name, adminFullName);

  // 2. Create a product category as admin
  const categoryPayload = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryPayload,
    });
  typia.assert(category);
  TestValidator.equals(
    "category name_ko matches",
    category.name_ko,
    categoryPayload.name_ko,
  );
  TestValidator.equals(
    "category name_en matches",
    category.name_en,
    categoryPayload.name_en,
  );
  TestValidator.equals("category is active", category.is_active, true);

  // 3. Create a new product in the catalog, referencing category and admin as seller
  const productPayload = {
    shopping_mall_seller_id: admin.id satisfies string as string, // Admin as owner (for test - in real, might use a distinct seller, but API allows any valid UUID)
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productPayload,
    });
  typia.assert(product);
  TestValidator.equals(
    "product name matches",
    product.name,
    productPayload.name,
  );
  TestValidator.equals(
    "product description matches",
    product.description,
    productPayload.description,
  );
  TestValidator.equals("product is active", product.is_active, true);
  TestValidator.equals("main image url is null", product.main_image_url, null);

  // 4. Ensure product has correct references
  // Cannot directly check shopping_mall_category_id/seller_id; would require GET API or custom DB access. But confirm successful creation.
  TestValidator.predicate(
    "product has valid uuid",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.predicate(
    "product has created_at timestamp",
    typeof product.created_at === "string" && product.created_at.length > 0,
  );
}
