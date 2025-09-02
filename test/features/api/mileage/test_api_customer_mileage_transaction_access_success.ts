import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import type { IShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileageTransaction";

export async function test_api_customer_mileage_transaction_access_success(
  connection: api.IConnection,
) {
  /**
   * Test that a customer can access their own mileage ledger transaction by
   * mileageId and transactionId.
   *
   * Workflow:
   *
   * 1. Register customer via join, obtaining authentication.
   * 2. Create a mileage ledger for this customer, with initial positive balance
   *    (serves as implicit transaction).
   * 3. Retrieve that (implicit) transaction using the ledger's id as both
   *    mileageId and transactionId (since the system likely creates an opening
   *    transaction on ledger creation).
   * 4. Validate that all fields—ledger reference, customer, amount, and
   *    before/after balances—are correct and internally consistent.
   *
   * Notes:
   *
   * - Since the only available means to create a transaction is via ledger
   *   creation's initial balance, this scenario validates the creation
   *   transaction.
   * - If future transaction-create/list/filter APIs exist, this test should be
   *   extended for richer transaction flows.
   */

  // Step 1: Customer registration (join)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinInput,
    });
  typia.assert(auth);
  const customerId = auth.customer.id;

  // Step 2: Create mileage ledger for customer with initial balance
  const initialMileage = 1000;
  const mileageLedger: IShoppingMallAiBackendMileage =
    await api.functional.shoppingMallAiBackend.customer.mileages.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_seller_id: null,
          total_accrued: initialMileage,
          usable_mileage: initialMileage,
          expired_mileage: 0,
          on_hold_mileage: 0,
        } satisfies IShoppingMallAiBackendMileage.ICreate,
      },
    );
  typia.assert(mileageLedger);

  // Step 3: Fetch the implicit creation transaction (assume transactionId = mileageLedger.id)
  const transactionId = mileageLedger.id as string & tags.Format<"uuid">;
  const transaction: IShoppingMallAiBackendMileageTransaction =
    await api.functional.shoppingMallAiBackend.customer.mileages.transactions.at(
      connection,
      {
        mileageId: mileageLedger.id,
        transactionId,
      },
    );
  typia.assert(transaction);

  // Step 4: Validate fields
  TestValidator.equals(
    "transaction ledger reference correct",
    transaction.shopping_mall_ai_backend_mileage_id,
    mileageLedger.id,
  );
  TestValidator.equals(
    "transaction customer matches ledger customer",
    transaction.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "initial mileage credited equals transaction amount",
    transaction.amount,
    initialMileage,
  );
  TestValidator.predicate(
    "transaction before + amount equals after",
    transaction.mileage_before + transaction.amount ===
      transaction.mileage_after,
  );
}
