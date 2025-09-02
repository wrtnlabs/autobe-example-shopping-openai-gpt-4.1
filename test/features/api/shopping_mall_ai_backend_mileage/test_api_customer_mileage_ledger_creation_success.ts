import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

export async function test_api_customer_mileage_ledger_creation_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful creation of a mileage (rewards points) ledger for a
   * customer.
   *
   * 1. Register a new customer to ensure fresh authentication context.
   * 2. Use the authenticated session to create a mileage ledger (with 0 initial
   *    balances).
   * 3. Validate:
   *
   *    - All audit fields (created_at, updated_at) exist and are valid ISO dates.
   *    - The ledger is linked to the correct customer by ID.
   *    - The ledger is not deleted (deleted_at is null or undefined).
   *    - All balances are correctly initialized to 0.
   *    - Ownership is customer-only (seller association is null).
   */

  // 1. Register new customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Create a mileage ledger for this customer
  const mileageInput = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_mileage: 0,
    expired_mileage: 0,
    on_hold_mileage: 0,
  } satisfies IShoppingMallAiBackendMileage.ICreate;
  const mileage =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      { body: mileageInput },
    );
  typia.assert(mileage);

  // 3. Validate linkage and fields
  TestValidator.equals(
    "mileage linked to correct customer",
    mileage.shopping_mall_ai_backend_customer_id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "seller association is null",
    mileage.shopping_mall_ai_backend_seller_id,
    null,
  );
  TestValidator.predicate(
    "audit created_at is valid ISO string",
    typeof mileage.created_at === "string" &&
      !isNaN(Date.parse(mileage.created_at)),
  );
  TestValidator.predicate(
    "audit updated_at is valid ISO string",
    typeof mileage.updated_at === "string" &&
      !isNaN(Date.parse(mileage.updated_at)),
  );
  TestValidator.equals(
    "audit: not deleted on creation",
    mileage.deleted_at ?? null,
    null,
  );
  TestValidator.equals("total_accrued == 0", mileage.total_accrued, 0);
  TestValidator.equals("usable_mileage == 0", mileage.usable_mileage, 0);
  TestValidator.equals("expired_mileage == 0", mileage.expired_mileage, 0);
  TestValidator.equals("on_hold_mileage == 0", mileage.on_hold_mileage, 0);
}
