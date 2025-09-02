import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptionUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnit";
import type { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";

export async function test_api_seller_product_option_unit_delete_already_deleted_failure(
  connection: api.IConnection,
) {
  /**
   * Test that deleting an already-deleted product option unit fails or is
   * idempotent.
   *
   * Steps:
   *
   * 1. Register and authenticate a seller.
   * 2. Create a product as this seller.
   * 3. Simulate creation of a product option group (by referencing a random UUID).
   * 4. Create a product option unit in the option group.
   * 5. Soft-delete the unit using the erase endpoint.
   * 6. Attempt to soft-delete again—expectation: must throw a business error or
   *    handle idempotency.
   */

  // 1. Register and authenticate a seller
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // 2. Create a product as seller
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 12,
          }),
          slug: RandomGenerator.alphaNumeric(16),
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
          max_order_quantity: 5,
          tax_code: RandomGenerator.alphaNumeric(8),
          sort_priority: 0,
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 4,
            wordMax: 12,
          }),
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Simulate option group ID (random UUID)
  const optionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a product option unit for the option group
  const unit =
    await api.functional.shoppingMallAiBackend.seller.products.options.units.create(
      connection,
      {
        productId: product.id,
        optionId,
        body: {
          shopping_mall_ai_backend_product_options_id: optionId,
          unit_value: RandomGenerator.pick([
            "Red",
            "Blue",
            "Green",
            "XL",
            "M",
            "L",
          ] as const),
          unit_code: RandomGenerator.alphaNumeric(6),
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductOptionUnit.ICreate,
      },
    );
  typia.assert(unit);

  // 5. Soft-delete the unit
  await api.functional.shoppingMallAiBackend.seller.products.options.units.erase(
    connection,
    {
      productId: product.id,
      optionId,
      unitId: unit.id,
    },
  );

  // 6. Attempt to delete it again and expect a failure (business error or idempotent constraint)
  await TestValidator.error(
    "Deleting an already-soft-deleted product option unit must fail or enforce idempotency",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.options.units.erase(
        connection,
        {
          productId: product.id,
          optionId,
          unitId: unit.id,
        },
      );
    },
  );
}
