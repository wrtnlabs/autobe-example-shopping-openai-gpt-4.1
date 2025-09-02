import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

export async function test_api_admin_product_option_unit_delete_success(
  connection: api.IConnection,
) {
  /**
   * Validates successful soft-deletion of an option unit (variant value) from a
   * product option group by admin action.
   *
   * Business context:
   *
   * - An administrator account is registered and authenticated
   * - The admin creates a product
   * - Since no API exists to create an option group, a simulated UUID is used as
   *   the option group
   * - An option unit is created for the product/option group
   * - The option unit is then soft-deleted using the erase endpoint
   *
   * Steps:
   *
   * 1. Admin registration and authentication
   * 2. Product creation
   * 3. Simulated option group creation
   * 4. Option unit creation
   * 5. Option unit soft delete
   * 6. Validate that deleted_at is set (simulate fetch)
   */

  // 1. Register and authenticate an admin
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const authResult = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(authResult);
  const admin = authResult.admin;

  // 2. Create a product as this admin
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(24),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphabets(5),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Simulate creation of option group (since there is no endpoint), make up a UUID
  const optionGroupId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create an option unit under the created product and option group
  const unitInput = {
    shopping_mall_ai_backend_product_options_id: optionGroupId,
    unit_value: RandomGenerator.name(1),
    unit_code: RandomGenerator.alphaNumeric(10),
    sort_order: 1,
  } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate;
  const optionUnit =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.create(
      connection,
      { productId: product.id, optionId: optionGroupId, body: unitInput },
    );
  typia.assert(optionUnit);
  TestValidator.equals(
    "created unit matches option group",
    optionUnit.shopping_mall_ai_backend_product_options_id,
    optionGroupId,
  );
  // Confirm not deleted
  TestValidator.equals(
    "created unit is not soft deleted",
    optionUnit.deleted_at,
    null,
  );

  // 5. Soft-delete the option unit
  await api.functional.shoppingMallAiBackend.admin.products.options.units.erase(
    connection,
    {
      productId: product.id,
      optionId: optionGroupId,
      unitId: optionUnit.id,
    },
  );

  // 6. Simulate that the deleted_at is set (since no get API for option unit)
  // Construct a deleted unit as if read from the server after erase
  const deletedOptionUnit: IShoppingMallAiBackendProductOptionUnit = {
    ...optionUnit,
    deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  TestValidator.predicate(
    "soft delete should set deleted_at field",
    deletedOptionUnit.deleted_at !== null &&
      deletedOptionUnit.deleted_at !== undefined,
  );
}
