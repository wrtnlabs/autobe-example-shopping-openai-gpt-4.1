import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import type { IShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileageTransaction";
import type { IPageIShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileageTransaction";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

export async function test_api_customer_mileage_transaction_history_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: A customer should be able to view their own mileage transaction
   * history, but not the history of other customers.
   *
   * Steps:
   *
   * 1. Register first customer and login
   * 2. Create a mileage ledger for the first customer
   * 3. Retrieve transaction history for own mileageId (success)
   * 4. Register second customer and login
   * 5. Attempt to retrieve transaction history for first customer's mileageId
   *    (RBAC fail)
   * 6. Check that error is thrown
   * 7. (Optional) Create mileage for second customer and check that their own
   *    history fetch works
   */
  // 1. Register first customer and login
  const customer1Input: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customer1Auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer1Input,
    });
  typia.assert(customer1Auth);
  const customer1 = customer1Auth.customer;
  // 2. Create a mileage ledger for the customer
  const mileage1Input: IShoppingMallAiBackendMileage.ICreate = {
    shopping_mall_ai_backend_customer_id: customer1.id,
    total_accrued: 1000,
    usable_mileage: 1000,
    expired_mileage: 0,
    on_hold_mileage: 0,
    shopping_mall_ai_backend_seller_id: null,
  };
  const mileage1 =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      {
        body: mileage1Input,
      },
    );
  typia.assert(mileage1);
  // 3. Retrieve transaction history for own mileageId (should succeed)
  const req: IShoppingMallAiBackendMileageTransaction.IRequest = {
    page: 1,
    limit: 10,
  };
  const history1 =
    await api.functional.shoppingMallAiBackend.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage1.id,
        body: req,
      },
    );
  typia.assert(history1);
  TestValidator.equals(
    "pagination page for own history",
    history1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "transaction history items array is returned for own",
    Array.isArray(history1.data),
  );
  // 4. Register second customer and login
  const customer2Input: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customer2Auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2Input,
    });
  typia.assert(customer2Auth);
  // 5. Attempt to access the first customer's mileage history as second customer (should fail)
  await TestValidator.error(
    "should not allow second customer to see first customer's transaction history",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.transactions.index(
        connection,
        {
          mileageId: mileage1.id,
          body: req,
        },
      );
    },
  );
  // 6. (Optional) Create mileage for second customer and check own history fetch
  const mileage2Input: IShoppingMallAiBackendMileage.ICreate = {
    shopping_mall_ai_backend_customer_id: customer2Auth.customer.id,
    total_accrued: 500,
    usable_mileage: 500,
    expired_mileage: 0,
    on_hold_mileage: 0,
    shopping_mall_ai_backend_seller_id: null,
  };
  const mileage2 =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      {
        body: mileage2Input,
      },
    );
  typia.assert(mileage2);
  const history2 =
    await api.functional.shoppingMallAiBackend.customer.mileages.transactions.index(
      connection,
      {
        mileageId: mileage2.id,
        body: req,
      },
    );
  typia.assert(history2);
  TestValidator.equals(
    "pagination page for 2nd customer own history",
    history2.pagination.current,
    1,
  );
  TestValidator.predicate(
    "transaction history items array for 2nd customer",
    Array.isArray(history2.data),
  );
}
