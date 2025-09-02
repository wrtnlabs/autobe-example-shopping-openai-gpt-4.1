import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * Validate admin product registration (success) and uniqueness failure
 * (duplicate slug).
 *
 * Business context:
 *
 * - Tests both the happy path (admin product creation works) and error case
 *   (slug uniqueness enforced)
 * - Admin authentication and platform product catalog features are tested
 *
 * Step-by-step process:
 *
 * 1. Register a unique, valid admin (using /auth/admin/join):
 *
 *    - Provide a valid, unique username, hashed password, real name, email,
 *         phone (optional), active status true
 *    - Confirm access/refresh tokens set in connection (auth context
 *         established)
 * 2. Prepare valid product data with a unique slug (all required fields set,
 *    according to ICreate spec)
 * 3. Create product as admin via /shoppingMallAiBackend/admin/products:
 *
 *    - Assert product is created successfully, all fields in response match
 *         input, with assigned id and correct timestamps
 *    - Validate business_status, product_type, and quantity/tax_code fields
 * 4. Attempt duplicate product creation with the same slug as above:
 *
 *    - Expect business logic/constraint error (slug uniqueness violation)
 *    - Ensure error thrown, no second product created
 * 5. Validate authentication context is required for product creation (done
 *    via step 1 join)
 *
 * Error scenarios and edge cases:
 *
 * - Duplicate slug fails regardless of business context
 * - Invalid token or no auth blocks product creation (implicitly validated)
 * - Missing/invalid required fields would fail but are not the primary focus
 */
export async function test_api_admin_product_creation_success_and_uniqueness_failure(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@testcompany.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // simulate secure hash
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminJoinInput = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: adminName,
    email: adminEmail,
    phone_number: adminPhone,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoinResp);
  TestValidator.equals(
    "admin account active",
    adminJoinResp.admin.is_active,
    true,
  );
  TestValidator.equals(
    "admin username matches input",
    adminJoinResp.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches input",
    adminJoinResp.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin authorized token is present",
    typeof adminJoinResp.token.access === "string" &&
      adminJoinResp.token.access.length > 0,
  );

  // 2. Prepare product creation input (use unique slug)
  const uniqueSlug = RandomGenerator.alphaNumeric(12);
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: uniqueSlug,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 10,
  } satisfies IShoppingMallAiBackendProduct.ICreate;

  // 3. Create product (should succeed)
  const productResp =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(productResp);
  TestValidator.equals(
    "product title matches",
    productResp.title,
    productInput.title,
  );
  TestValidator.equals(
    "product slug matches",
    productResp.slug,
    productInput.slug,
  );
  TestValidator.equals(
    "product type matches",
    productResp.product_type,
    productInput.product_type,
  );
  TestValidator.equals(
    "product business status matches",
    productResp.business_status,
    productInput.business_status,
  );
  TestValidator.equals(
    "min order quantity matches",
    productResp.min_order_quantity,
    productInput.min_order_quantity,
  );
  TestValidator.equals(
    "max order quantity matches",
    productResp.max_order_quantity,
    productInput.max_order_quantity,
  );
  TestValidator.equals(
    "tax code matches",
    productResp.tax_code,
    productInput.tax_code,
  );
  TestValidator.equals(
    "sort priority matches",
    productResp.sort_priority,
    productInput.sort_priority,
  );
  TestValidator.predicate(
    "product id is present and formatted",
    typeof productResp.id === "string" && productResp.id.length > 0,
  );
  TestValidator.predicate(
    "created_at valid timestamp string",
    typeof productResp.created_at === "string" &&
      !!Date.parse(productResp.created_at),
  );
  TestValidator.predicate(
    "updated_at valid timestamp string",
    typeof productResp.updated_at === "string" &&
      !!Date.parse(productResp.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or absent",
    productResp.deleted_at ?? null,
    null,
  );
  if (productResp.description !== undefined)
    TestValidator.equals(
      "product description matches",
      productResp.description,
      productInput.description,
    );

  // 4. Attempt to create with duplicate slug (should fail)
  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          ...productInput,
          title: RandomGenerator.paragraph({ sentences: 2 }), // different title, duplicate slug
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  });
}
