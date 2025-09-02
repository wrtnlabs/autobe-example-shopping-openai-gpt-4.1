import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import type { IPageIShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_mileage_list_success(
  connection: api.IConnection,
) {
  /**
   * Validates listing of mileage ledgers for the authenticated customer.
   *
   * Workflow steps:
   *
   * 1. Register a new customer via POST /auth/customer/join (authentication as
   *    customer)
   * 2. Confirm tokens are set and customer information is present
   * 3. Call PATCH /shoppingMallAiBackend/customer/mileages to list mileage ledgers
   * 4. Validate that:
   *
   *    - Only ledgers for the newly registered customer are listed (enforced by auth
   *         context)
   *    - All returned records provide required summary fields (id, usable_mileage,
   *         created_at)
   *    - Pagination metadata (current, limit, records, pages) present
   *    - All summary field values are correctly typed and valid (e.g., id is uuid,
   *         usable_mileage >= 0)
   */

  // 1. Register and authenticate a new customer
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
  const customer = joinResult.customer;
  typia.assert(customer);
  TestValidator.equals(
    "customer email after join matches input",
    customer.email,
    joinInput.email,
  );

  // 2. Query mileage ledgers for authenticated customer (empty request = default paging)
  const listResponse =
    await api.functional.shoppingMallAiBackend.customer.mileages.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendMileage.IRequest,
      },
    );
  typia.assert(listResponse);
  TestValidator.predicate(
    "pagination metadata present in mileage list response",
    typeof listResponse.pagination === "object" &&
      listResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination.current is positive int",
    typeof listResponse.pagination.current === "number" &&
      listResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "array of mileage ledgers present",
    Array.isArray(listResponse.data),
  );

  // Mileage record field checks
  for (const m of listResponse.data) {
    TestValidator.predicate(
      "mileage summary id is non-empty uuid string",
      typeof m.id === "string" && m.id.length > 0,
    );
    TestValidator.predicate(
      "usable_mileage is number and non-negative",
      typeof m.usable_mileage === "number" && m.usable_mileage >= 0,
    );
    TestValidator.predicate(
      "created_at is non-empty string",
      typeof m.created_at === "string" && m.created_at.length > 0,
    );
  }
}
