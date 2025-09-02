import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

export async function test_api_product_file_update_admin_invalid_payload(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin product file update validation (invalid payload)
   *
   * This test verifies that the product file update API correctly rejects
   * payloads that violate schema or business rules, and that appropriate
   * validation/business errors are produced. It ensures that both required
   * field omission and illegal field values are properly enforced by the update
   * endpoint for product files as accessed by an admin.
   *
   * Steps:
   *
   * 1. Register an admin account and establish admin authentication context
   * 2. Create a product as the admin
   * 3. Upload a file (image) to the created product
   * 4. Attempt to update file with an empty payload (should fail: update requires
   *    at least one property)
   * 5. Attempt to update file with invalid field values (negative display order,
   *    malformed file_uri, or wrong type for is_primary)
   * 6. Validate that all such attempts result in error responses consistent with
   *    validation/business rule enforcement (via TestValidator.error)
   */

  // Step 1: Register a new admin (for authentication)
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Create a new product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          product_type: RandomGenerator.alphaNumeric(6),
          business_status: RandomGenerator.pick([
            "active",
            "draft",
            "paused",
          ] as const),
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(4),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // Step 3: Upload a file to the product
  const fileCreate: IShoppingMallAiBackendProductFile.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: "image/jpeg",
    display_order: 0,
    is_primary: true,
  };
  const file =
    await api.functional.shoppingMallAiBackend.admin.products.files.create(
      connection,
      {
        productId: product.id,
        body: fileCreate,
      },
    );
  typia.assert(file);

  // Step 4: Attempt update with completely empty payload { } (should fail: update requires one or more valid properties; empty is illegal)
  await TestValidator.error(
    "should reject completely empty update body for file update",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: file.id,
          body: {}, // purposely no fields present
        },
      );
    },
  );

  // Step 5: Attempt update with negative display_order (should fail: must be >= 0), and malformed file_uri (should fail if URI validation enforced)
  await TestValidator.error(
    "should reject update with negative display_order and malformed file_uri",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: file.id,
          body: {
            display_order: -10, // invalid: must be positive
            file_uri: "not-a-valid-uri", // invalid URI if business enforces format
          } satisfies IShoppingMallAiBackendProductFile.IUpdate,
        },
      );
    },
  );

  // Step 6: Attempt update with wrong type for is_primary (should fail: expects boolean)
  await TestValidator.error(
    "should reject update with non-boolean is_primary property",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: file.id,
          body: {
            is_primary: "yes" as unknown as boolean, // purposely incorrect type
          } as any, // error injection for negative test
        },
      );
    },
  );
}
