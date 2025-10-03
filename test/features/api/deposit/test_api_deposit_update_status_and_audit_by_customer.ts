import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";

/**
 * Test updating deposit status as a customer and audit enforcement.
 *
 * 1. Register and authenticate a new customer (join)
 * 2. Create an initial deposit account for the customer
 * 3. Update the deposit status to 'frozen' (valid status transition)
 * 4. Confirm the deposit status is updated in the returned object
 * 5. Try to change the balance directly as the customer (should be denied)
 * 6. Assert that updating the balance as customer is rejected (business rule)
 * 7. Optionally re-read the deposit for audit purposes to confirm only the status
 *    changed
 */
export async function test_api_deposit_update_status_and_audit_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration (join)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email: customerEmail,
    password: "testpass123",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create deposit account
  const createDepositBody = {
    shopping_mall_customer_id: customer.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: createDepositBody,
    });
  typia.assert(deposit);

  // 3. Update deposit status to 'frozen'
  const updateStatusBody = {
    status: "frozen",
  } satisfies IShoppingMallDeposit.IUpdate;
  const updated: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.update(connection, {
      depositId: deposit.id,
      body: updateStatusBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "deposit status is updated to frozen",
    updated.status,
    "frozen",
  );

  // 4. Attempt to update balance directly as customer (should be denied)
  const updateBalanceBody = {
    balance: 1000,
  } satisfies IShoppingMallDeposit.IUpdate;
  await TestValidator.error(
    "customer cannot update deposit balance directly",
    async () => {
      await api.functional.shoppingMall.customer.deposits.update(connection, {
        depositId: deposit.id,
        body: updateBalanceBody,
      });
    },
  );
}
