import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";

export async function test_api_customer_withdrawal_detail_notfound(
  connection: api.IConnection,
) {
  /**
   * Test retrieving withdrawal event details with a nonexistent or unauthorized
   * withdrawalId as a customer.
   *
   * 1. Register (join) a new customer and complete authentication.
   * 2. Attempt to fetch withdrawal details for a random UUID (not associated with
   *    this customer).
   * 3. Confirm that the API throws an error and does not leak other users'
   *    withdrawal data.
   */
  // 1. Register a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(joinResult);
  const customer = joinResult.customer;
  typia.assert(customer);

  // 2. Use a non-existent withdrawalId (random UUID) for this test
  const fakeWithdrawalId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch withdrawal details with a forged/nonexistent withdrawalId
  await TestValidator.error(
    "should not find withdrawal for random/invalid withdrawalId",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.customers.withdrawals.at(
        connection,
        {
          customerId: customer.id,
          withdrawalId: fakeWithdrawalId,
        },
      );
    },
  );
}
