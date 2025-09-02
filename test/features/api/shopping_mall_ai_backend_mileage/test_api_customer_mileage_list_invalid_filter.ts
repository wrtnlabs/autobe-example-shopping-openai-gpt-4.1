import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import type { IPageIShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_mileage_list_invalid_filter(
  connection: api.IConnection,
) {
  /**
   * Test mileage listing with invalid pagination/filter values, ensuring proper
   * validation errors are triggered.
   *
   * Steps:
   *
   * 1. Register a new customer via /auth/customer/join to get Authorization.
   * 2. Attempt PATCH /shoppingMallAiBackend/customer/mileages with the following
   *    invalid filters: a. Negative page number b. Negative limit number c.
   *    Out-of-bounds huge page number d. Zero limit value e. Null page and/or
   *    limit (if null is not acceptable as a valid integer)
   * 3. For each attempt, assert that an error is thrown using TestValidator.error.
   *
   * Validation: API must reject invalid input and never return a success data
   * result for these cases.
   */

  // 1. Register a customer (prerequisite for authentication).
  const customerReg = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerReg);

  // 2. Invalid PATCH requests with out-of-range/invalid filter values.
  // a. Negative page
  await TestValidator.error(
    "negative page triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.index(
        connection,
        {
          body: {
            page: -1,
            limit: 10,
          } satisfies IShoppingMallAiBackendMileage.IRequest,
        },
      );
    },
  );
  // b. Negative limit
  await TestValidator.error(
    "negative limit triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.index(
        connection,
        {
          body: {
            page: 1,
            limit: -50,
          } satisfies IShoppingMallAiBackendMileage.IRequest,
        },
      );
    },
  );
  // c. Out-of-bounds huge page
  await TestValidator.error("huge page triggers validation error", async () => {
    await api.functional.shoppingMallAiBackend.customer.mileages.index(
      connection,
      {
        body: {
          page: 1000000,
          limit: 10,
        } satisfies IShoppingMallAiBackendMileage.IRequest,
      },
    );
  });
  // d. Zero limit value
  await TestValidator.error(
    "zero limit triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.index(
        connection,
        {
          body: {
            page: 1,
            limit: 0,
          } satisfies IShoppingMallAiBackendMileage.IRequest,
        },
      );
    },
  );
  // e. Null values for page & limit (should be rejected if null is not valid in practice)
  await TestValidator.error(
    "null page and/or limit triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.index(
        connection,
        {
          body: {
            page: null,
            limit: null,
          } satisfies IShoppingMallAiBackendMileage.IRequest,
        },
      );
    },
  );
}
