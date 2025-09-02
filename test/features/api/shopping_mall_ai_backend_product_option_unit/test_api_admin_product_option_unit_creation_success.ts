import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

/**
 * Test creation of a new product option unit (e.g., color/size variant) by
 * an admin.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using the join endpoint (required for
 *    authorization on all subsequent admin endpoints).
 * 2. Create a product (provides a parent entity for all options and units).
 * 3. (Business logic step) Simulate/generate an option group (optionId) under
 *    the product—since there are no endpoints provided for creating or
 *    listing option groups, assume a randomly generated optionId that would
 *    represent a valid option group attached to the product. This
 *    limitation is due to the restricted set of available API calls.
 * 4. Use the
 *    /shoppingMallAiBackend/admin/products/{productId}/options/{optionId}/units
 *    API to create a new option unit (such as a color or size variant),
 *    sending a valid IShoppingMallAiBackendProductOptionUnit.ICreate
 *    payload.
 * 5. Verify:
 *
 *    - The API returns a unit containing the expected fields (id,
 *         shopping_mall_ai_backend_product_options_id, unit_value,
 *         unit_code, sort_order, etc.),
 *    - The unit is associated to the intended product option group (via the
 *         given optionId),
 *    - The unit's relevant properties (unit_value, unit_code, sort_order) match
 *         the input data.
 *
 * The test will utilize random valid values for all necessary fields
 * (usernames, emails, slugs, codes), using typia.random and RandomGenerator
 * as appropriate. Due to lack of option group creation in the test surface,
 * the association is by UUID only for the purposes of validating
 * request/response structure and admin authorization.
 */
export async function test_api_admin_product_option_unit_creation_success(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32), // Assuming pre-hashed for test
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "registered admin username echoed",
    adminAuth.admin.username,
    adminInput.username,
  );
  TestValidator.equals("admin is active", adminAuth.admin.is_active, true);

  // 2. Product creation
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 12 }),
    slug: RandomGenerator.alphaNumeric(20),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 12,
    }),
    product_type: RandomGenerator.alphabets(6),
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
  TestValidator.equals(
    "product title echoed",
    product.title,
    productInput.title,
  );
  TestValidator.equals(
    "product min/max order quantity",
    product.max_order_quantity,
    productInput.max_order_quantity,
  );

  // 3. Simulate option group (optionId) for unit attachment
  // No actual endpoint to create option groups; generate a random UUID for test
  const optionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create product option unit
  const unitInput: IShoppingMallAiBackendProductOptionUnit.ICreate = {
    shopping_mall_ai_backend_product_options_id: optionId,
    unit_value: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 16,
    }),
    unit_code: RandomGenerator.alphaNumeric(10),
    sort_order: 1,
  } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate;
  const unit =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionId,
        body: unitInput,
      },
    );
  typia.assert(unit);
  TestValidator.equals(
    "unit group matches input",
    unit.shopping_mall_ai_backend_product_options_id,
    unitInput.shopping_mall_ai_backend_product_options_id,
  );
  TestValidator.equals(
    "unit value matches input",
    unit.unit_value,
    unitInput.unit_value,
  );
  TestValidator.equals(
    "unit code matches input",
    unit.unit_code,
    unitInput.unit_code,
  );
  TestValidator.equals(
    "unit sort order matches input",
    unit.sort_order,
    unitInput.sort_order,
  );
}
