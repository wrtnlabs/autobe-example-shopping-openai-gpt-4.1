import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

export async function test_api_admin_product_option_unit_update_duplicate_unit_code_failure(
  connection: api.IConnection,
) {
  /**
   * E2E test for enforcing unique unit_code constraint within an option group
   * when updating product option units.
   *
   * This test validates that attempting to update a product option unit's
   * unit_code to a value that already exists for another unit in the same
   * option group results in a backend error (unique constraint violation), and
   * that no accidental update occurs.
   *
   * Workflow:
   *
   * 1. Admin registration and authentication, obtaining session token
   * 2. Product creation as admin
   * 3. Two option units created under the same option group with distinct codes
   * 4. Attempt to update first unit's unit_code to that of the second (should
   *    fail)
   * 5. Verify the first unit's unit_code remains unchanged in the context
   */

  // 1. Register and authenticate as admin
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create new product
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          product_type: "physical",
          business_status: "active",
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: RandomGenerator.alphaNumeric(6),
          sort_priority: 1,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create first option unit (A)
  const optionId = typia.random<string & tags.Format<"uuid">>();
  const unitCodeA = RandomGenerator.alphaNumeric(7);
  const unitValueA = RandomGenerator.name(1);
  const unitA =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionId,
        body: {
          shopping_mall_ai_backend_product_options_id: optionId,
          unit_value: unitValueA,
          unit_code: unitCodeA,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(unitA);

  // 4. Create second option unit (B)
  const unitCodeB = RandomGenerator.alphaNumeric(7);
  const unitValueB = RandomGenerator.name(1);
  const unitB =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionId,
        body: {
          shopping_mall_ai_backend_product_options_id: optionId,
          unit_value: unitValueB,
          unit_code: unitCodeB,
          sort_order: 2,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(unitB);

  // 5. Try to update Unit A's code to match Unit B's code – should fail
  await TestValidator.error(
    "cannot update option unit with duplicate unit_code within the same option group",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.options.units.update(
        connection,
        {
          productId: product.id,
          optionId: optionId,
          unitId: unitA.id,
          body: {
            unit_code: unitCodeB,
          } satisfies IShoppingMallAiBackendProductOptionUnit.IUpdate,
        },
      );
    },
  );

  // 6. Confirm unitA's unit_code remains the original value from before attempted mutation
  TestValidator.equals(
    "original unit_code of Unit A remains after failed update",
    unitA.unit_code,
    unitCodeA,
  );
}
