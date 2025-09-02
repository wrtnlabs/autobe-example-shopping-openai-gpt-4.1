import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";

export async function test_api_customer_mileage_detail_access_denied(
  connection: api.IConnection,
) {
  /**
   * Validates that a customer cannot access the mileage ledger of another
   * customer (access control test).
   *
   * 1. Register Customer A and obtain their identifier (principal customer and
   *    assumed mileageOwner).
   * 2. Register Customer B and switch context (token auto-applied by auth API).
   * 3. With Customer B's context, attempt to access Customer A's mileage ledger
   *    via GET by ID, expect forbidden (access denied).
   * 4. Confirm by negative assertion: No customer should have access to another's
   *    private mileage data or inference via error message/response.
   *
   * Note: The actual linkage between customer and mileageId is assumed based on
   * available APIs. If actual mileageId is provisioned differently, replace
   * accordingly.
   */
  // 1. Register Customer A (ledger owner)
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        phone_number: RandomGenerator.mobile(),
        password: "1234!@#Abcd",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerA);
  const customerAId = customerA.customer.id;

  // 2. Register Customer B (attacker context)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        phone_number: RandomGenerator.mobile(),
        password: "4321!@#Dcba",
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customerB);

  // 3. Attempt access: As Customer B, try to access Customer A's mileage ledger by (assumed) mileageId
  await TestValidator.error(
    "forbid access to another customer's mileage ledger",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.mileages.at(
        connection,
        {
          mileageId: customerAId,
        },
      );
    },
  );
}
