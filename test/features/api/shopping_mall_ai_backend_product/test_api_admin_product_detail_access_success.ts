import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_admin_product_detail_access_success(
  connection: api.IConnection,
) {
  /**
   * Test business logic for admin viewing full product details.
   *
   * 1. Register a new admin account (for privileged API access).
   * 2. Use the admin to create a valid product (populate all required fields).
   * 3. Retrieve the product back (GET by its ID via the admin detail endpoint).
   * 4. Assert all business/inventory/compliance fields in the detail match what
   *    was set at creation (field-by-field equality checking).
   */
  // 1. Register admin
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: adminUsername,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: adminEmail,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin registration - username",
    adminAuth.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin registration - email",
    adminAuth.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin registration returns active admin",
    adminAuth.admin.is_active === true,
  );

  // 2. Admin creates new product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 8,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
      "package",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
      "archived",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: `TAX-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    sort_priority: 10,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Retrieve the product by ID via admin detail endpoint
  const detail = await api.functional.shoppingMallAiBackend.admin.products.at(
    connection,
    { productId: product.id },
  );
  typia.assert(detail);
  // 4. Assert all fields that were input match those in the detail (except auto-generated fields)
  TestValidator.equals("product id matches", detail.id, product.id);
  TestValidator.equals(
    "product title matches",
    detail.title,
    productInput.title,
  );
  TestValidator.equals("product slug matches", detail.slug, productInput.slug);
  TestValidator.equals(
    "product description matches",
    detail.description,
    productInput.description,
  );
  TestValidator.equals(
    "product type matches",
    detail.product_type,
    productInput.product_type,
  );
  TestValidator.equals(
    "business status matches",
    detail.business_status,
    productInput.business_status,
  );
  TestValidator.equals(
    "min order quantity matches",
    detail.min_order_quantity,
    productInput.min_order_quantity,
  );
  TestValidator.equals(
    "max order quantity matches",
    detail.max_order_quantity,
    productInput.max_order_quantity,
  );
  TestValidator.equals(
    "tax code matches",
    detail.tax_code,
    productInput.tax_code,
  );
  TestValidator.equals(
    "sort priority matches",
    detail.sort_priority,
    productInput.sort_priority,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null at creation",
    detail.deleted_at,
    null,
  );
}
