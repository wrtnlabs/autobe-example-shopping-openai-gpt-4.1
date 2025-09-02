import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

/**
 * Validate customer can retrieve own mileage ledger details (success path).
 *
 * Scenario Steps:
 *
 * 1. Register a customer (sets up Authentication, customer context)
 * 2. Extract the mileage ledger ID linked to the registered customer (by
 *    business convention)
 * 3. Fetch detail from GET
 *    /shoppingMallAiBackend/customer/mileages/{mileageId} using correct ID
 * 4. Validate returned fields: identities, balance fields, audit fields,
 *    ownership and authorization
 * 5. Assert all business and technical constraints (no negative balances,
 *    correct type/formatting, correct ownership, etc)
 */
export async function test_api_customer_mileage_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a customer account and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const phone_number = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const join: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        phone_number,
        password,
        name,
        nickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(join);
  TestValidator.equals(
    "returned customer email matches input",
    join.customer.email,
    email,
  );
  TestValidator.equals("customer is active", join.customer.is_active, true);
  TestValidator.predicate(
    "customer is_verified is boolean",
    typeof join.customer.is_verified === "boolean",
  );

  // 2. Per business contract, mileage ledger is created at join (1:1 mapping)
  // Use customer.id as the mileage ledger ID for this test case
  const mileageId = join.customer.id as string & tags.Format<"uuid">;

  // 3. Fetch the mileage ledger detail by ID
  const mileage =
    await api.functional.shoppingMallAiBackend.customer.mileages.at(
      connection,
      { mileageId },
    );
  typia.assert(mileage);

  // 4. Validate core business and audit fields
  TestValidator.equals("mileage id matches parameter", mileage.id, mileageId);
  TestValidator.equals(
    "customer id matches mileage owner",
    mileage.shopping_mall_ai_backend_customer_id,
    join.customer.id,
  );
  TestValidator.equals(
    "seller id is null for customer mileage",
    mileage.shopping_mall_ai_backend_seller_id,
    null,
  );
  TestValidator.predicate(
    "total_accrued is non-negative",
    mileage.total_accrued >= 0,
  );
  TestValidator.predicate(
    "usable_mileage is non-negative",
    mileage.usable_mileage >= 0,
  );
  TestValidator.predicate(
    "expired_mileage is non-negative",
    mileage.expired_mileage >= 0,
  );
  TestValidator.predicate(
    "on_hold_mileage is non-negative",
    mileage.on_hold_mileage >= 0,
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof mileage.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof mileage.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null for active mileage",
    mileage.deleted_at,
    null,
  );
}
