import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_delete_nonexistent_external_identity_failure(
  connection: api.IConnection,
) {
  /**
   * Validate that attempting to delete a non-existent external identity as a
   * customer fails.
   *
   * 1. Register a customer (join) to obtain a valid auth context and customer id.
   * 2. Attempt to delete an external identity for this customer, where the
   *    externalIdentityId is a fresh random uuid (and presumed nonexistent).
   * 3. The API operation must fail with a 'not found' or 'forbidden' error code
   *    (not success).
   */

  // Step 1: Register the customer to obtain authentication and a customer id
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    // nickname is optional
  };
  const joinResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(joinResult);
  const customerId: string = joinResult.customer.id;

  // Step 2: Attempt to delete an external identity record with a non-existent externalIdentityId
  const nonExistentExternalIdentityId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "delete of non-existent external identity should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.erase(
        connection,
        {
          customerId,
          externalIdentityId: nonExistentExternalIdentityId,
        },
      );
    },
  );
}
