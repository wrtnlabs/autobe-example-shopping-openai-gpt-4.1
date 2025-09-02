import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

export async function test_api_admin_product_option_unit_update_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful update of a product option unit by an admin.
   *
   * This test covers the following business workflow:
   *
   * 1. Register an admin account (establishes an admin authentication context)
   * 2. Create a product as admin, so options and units can be managed
   * 3. Add a product option group (simulate by creating the option group id)
   * 4. Create an option unit for that option group
   * 5. Update the unit with new values using the update endpoint
   * 6. Validate that the update is applied
   */
  // 1. Register admin account
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@test.co.kr`;
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Create product -- required for attaching option group/unit
  const productCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 10,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "bundle",
    ] as const),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 10,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(product);

  // 3. Simulate product option group creation (API not available: generate id)
  const optionGroupId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create product option unit
  const unitValue = RandomGenerator.pick([
    "Red",
    "Blue",
    "Green",
    "XL",
    "L",
  ] as const);
  const unitCode = RandomGenerator.alphaNumeric(6);
  const sortOrder = 1;
  const unit =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId: optionGroupId,
        body: {
          shopping_mall_ai_backend_product_options_id: optionGroupId,
          unit_value: unitValue,
          unit_code: unitCode,
          sort_order: sortOrder,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(unit);

  // 5. Update the unit: change all fields
  const updatedUnitValue = RandomGenerator.pick([
    "Black",
    "White",
    "Yellow",
    "S",
    "M",
  ] as const);
  const updatedUnitCode = RandomGenerator.alphaNumeric(8);
  const updatedSortOrder = 2;
  const updated =
    await api.functional.shoppingMallAiBackend.admin.products.options.units.update(
      connection,
      {
        productId: product.id,
        optionId: optionGroupId,
        unitId: unit.id,
        body: {
          unit_value: updatedUnitValue,
          unit_code: updatedUnitCode,
          sort_order: updatedSortOrder,
        } satisfies IShoppingMallAiBackendProductOptionUnit.IUpdate,
      },
    );
  typia.assert(updated);

  // 6. Validate that the updated fields reflect the update
  TestValidator.equals(
    "unit id should not change after update",
    updated.id,
    unit.id,
  );
  TestValidator.equals(
    "unit value updated",
    updated.unit_value,
    updatedUnitValue,
  );
  TestValidator.equals("unit code updated", updated.unit_code, updatedUnitCode);
  TestValidator.equals(
    "sort order updated",
    updated.sort_order,
    updatedSortOrder,
  );
  TestValidator.equals(
    "option group id remains",
    updated.shopping_mall_ai_backend_product_options_id,
    optionGroupId,
  );
}
