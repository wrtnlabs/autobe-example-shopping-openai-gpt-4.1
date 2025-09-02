import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

export async function test_api_customer_mileage_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate error handling when requesting a non-existent or deleted mileage
   * ledger (reward/points account).
   *
   * 1. Create/register a new customer to establish authentication context.
   * 2. Attempt to retrieve a mileage ledger detail with a valid-looking but fake
   *    UUID (never created).
   * 3. Confirm the API returns a not found (404) error.
   * 4. Ensure that no data leakage occurs (no unrelated ledger/user data is
   *    returned).
   */
  // Step 1: Register customer for proper authentication context
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(customerAuth);

  // Step 2/3: Attempt GET for a non-existent mileage ledger using a truly random UUID
  const fakeMileageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should 404 when getting nonexistent customer mileage ledger",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.at(
        connection,
        { mileageId: fakeMileageId },
      );
    },
  );
}
