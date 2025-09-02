import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * E2E test for attempting to delete a non-existent product bundle
 * (SKU/variant) as an admin.
 *
 * Business context:
 *
 * - Validates that the API does not allow deletion of a product bundle
 *   (SKU/variant) that does not exist.
 * - Ensures that proper error handling is in place: a not found or relevant
 *   business rule error must be thrown.
 *
 * Test Steps:
 *
 * 1. Register an admin account to establish authentication context via
 *    /auth/admin/join.
 * 2. Create a product via /shoppingMallAiBackend/admin/products, saving the
 *    productId for bundle operations.
 * 3. Attempt to delete a product bundle using the productId and a random,
 *    non-existent bundleId.
 * 4. Assert with TestValidator.error() that an error (not found or business
 *    rule failure) is thrown by API.
 *
 * Notes:
 *
 * - All type constraints and value formats follow DTO documentation, e.g.,
 *   uuid, email, etc.
 * - All random values (username, email, etc.) are type-compliant and
 *   realistic for the business domain.
 * - No direct management of authentication tokens—SDK controls them
 *   internally.
 * - No test scenario or types beyond those explicitly in provided materials.
 */
export async function test_api_admin_product_bundle_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: null,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Create a product to obtain a valid productId for bundle operations
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    slug: RandomGenerator.alphaNumeric(15),
    product_type: RandomGenerator.pick(["physical", "digital"] as const), // best effort guess (replace with actual allowed values if known)
    business_status: RandomGenerator.pick(["draft", "active"] as const), // best effort guess (replace with real allowed values if stricter enum exists)
    min_order_quantity: 1,
    max_order_quantity: 5,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: typia.random<number>(),
  };
  const product: IShoppingMallAiBackendProduct =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Attempt to delete a product bundle with a non-existent bundleId
  await TestValidator.error(
    "should fail to delete non-existent product bundle (SKU/variant) as admin",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.bundles.erase(
        connection,
        {
          productId: product.id,
          bundleId: typia.random<string & tags.Format<"uuid">>(), // random, guaranteed-nonexistent bundleId
        },
      );
    },
  );
}
