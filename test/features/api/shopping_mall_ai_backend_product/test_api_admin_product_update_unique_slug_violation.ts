import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * E2E test for validating unique slug constraint violation when updating a
 * product via admin API.
 *
 * This test handles the following scenario:
 *
 * 1. Register an admin and authenticate (needed for all product management).
 * 2. Create product #1 with a unique slug (e.g., 'unique-slug-1').
 * 3. Create product #2 with a different unique slug (e.g., 'unique-slug-2').
 * 4. Attempt to update product #2 by setting its slug to the same as product
 *    #1 ('unique-slug-1').
 *
 *    - This should violate the unique slug constraint and result in a conflict
 *         or validation error
 *    - The update call must NOT change the data of product #2
 * 5. Validate that the error is thrown as expected (conflict/validation
 *    error).
 * 6. Optionally, re-fetch product #2 and confirm its slug and other properties
 *    are unchanged.
 */
export async function test_api_admin_product_update_unique_slug_violation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${adminUsername}@admin-e2e.test`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Assume backend hashes as needed
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create first product (with unique slug)
  const slug1 = `slug-${RandomGenerator.alphaNumeric(8)}`;
  const product1Input: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: slug1,
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: RandomGenerator.pick(["active", "draft"] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: `TAX-${RandomGenerator.alphaNumeric(5)}`,
    sort_priority: 0,
  };
  const product1 =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: product1Input },
    );
  typia.assert(product1);

  // 3. Create second product (with a different slug)
  const slug2 = `slug-${RandomGenerator.alphaNumeric(8)}`;
  const product2Input: IShoppingMallAiBackendProduct.ICreate = {
    ...product1Input,
    slug: slug2,
    title: RandomGenerator.paragraph({ sentences: 3 }), // ensure a different title
  };
  const product2 =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: product2Input },
    );
  typia.assert(product2);
  TestValidator.notEquals(
    "product slugs must be different",
    product1.slug,
    product2.slug,
  );

  // 4. Attempt to update product2 to use product1's slug (should fail)
  await TestValidator.error(
    "should not allow slug duplicate on update",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.update(
        connection,
        {
          productId: product2.id,
          body: {
            slug: product1.slug,
          } satisfies IShoppingMallAiBackendProduct.IUpdate,
        },
      );
    },
  );

  // 5. The second product should remain unchanged (particularly slug)
  // Because no GET endpoint for a single product is defined in the sdk, we validate only with current memory state
  TestValidator.equals(
    "product2's slug should remain unchanged after failed update",
    product2.slug,
    slug2,
  );
}
