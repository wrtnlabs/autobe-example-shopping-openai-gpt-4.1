import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";
import type { IPageIShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomerExternalIdentity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_external_identities_index_success(
  connection: api.IConnection,
) {
  /**
   * Test successful retrieval of customer external identities.
   *
   * - Registers a new customer for authenticated context.
   * - Calls the external identity list endpoint with the customer's id.
   * - Validates empty external identity list immediately after registration.
   * - Verifies pagination and edge case with explicit page/limit.
   */

  // 1. Register a new customer (authentication context is set by SDK).
  const joinPayload: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinPayload });
  typia.assert(joinResult);

  // 2. Retrieve external identity list (expected empty).
  const output: IPageIShoppingMallAiBackendCustomerExternalIdentity.ISummary =
    await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.index(
      connection,
      {
        customerId: joinResult.customer.id,
        body: {},
      },
    );
  typia.assert(output);

  // 3. Validate empty list and pagination fields.
  TestValidator.equals(
    "external identity list empty state",
    output.data.length,
    0,
  );
  TestValidator.equals("pagination current is 1", output.pagination.current, 1);
  TestValidator.predicate(
    "no external identity records after registration",
    output.pagination.records === 0,
  );

  // 4. Edge case: Explicit pagination (page=1, limit=5)
  const pagedOutput: IPageIShoppingMallAiBackendCustomerExternalIdentity.ISummary =
    await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.index(
      connection,
      {
        customerId: joinResult.customer.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(pagedOutput);
  TestValidator.equals(
    "explicit paged list still empty",
    pagedOutput.data.length,
    0,
  );
  TestValidator.equals(
    "explicit paged current is 1",
    pagedOutput.pagination.current,
    1,
  );
  TestValidator.predicate(
    "explicit paged record count still zero",
    pagedOutput.pagination.records === 0,
  );
}
