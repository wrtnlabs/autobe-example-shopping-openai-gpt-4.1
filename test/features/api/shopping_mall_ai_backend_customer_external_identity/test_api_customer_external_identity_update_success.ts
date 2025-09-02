import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";

/**
 * Validates the ability for a customer to update their own linked external
 * identity record.
 *
 * This test simulates a real customer journey: it registers (joins) a new
 * customer, simulates linkage of an external identity (since there is no
 * direct API endpoint, constructs the data explicitly as if the linkage
 * occurred), and then updates properties of that identity using the
 * dedicated PUT endpoint.
 *
 * The test asserts that the update is applied correctly and reflected in
 * the returned external identity record. It also checks business rule
 * enforcement: another customer attempting the update is forbidden, and
 * updating a non-existent identity returns a not-found error.
 *
 * Steps:
 *
 * 1. Register (join) a new customer and extract their customerId from the
 *    result.
 * 2. Construct a new external identity object, emulating provider linkage
 *    (since no API; inject a record for testing purposes).
 * 3. Update one or more fields (provider_key, last_verified_at) of the linked
 *    identity using PUT endpoint.
 * 4. Assert the response includes the new values, and unchanged fields remain
 *    consistent.
 * 5. Register (join) a second customer, and attempt to update the original
 *    customer's identity (expect error).
 * 6. Attempt to update a non-existent external identity id (expect error).
 */
export async function test_api_customer_external_identity_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const customerId = typia.assert(authorized.customer.id);

  // 2. Construct a linked external identity (emulating linkage, direct test state setup)
  const fakeIdentity: IShoppingMallAiBackendCustomerExternalIdentity = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: customerId,
    provider: RandomGenerator.pick([
      "google",
      "apple",
      "naver",
      "kakao",
    ] as const),
    provider_key: RandomGenerator.alphaNumeric(24),
    linked_at: new Date().toISOString(),
    last_verified_at: null,
  };

  // 3. Update one or more fields with PUT endpoint (e.g. provider_key, last_verified_at)
  const newProviderKey = RandomGenerator.alphaNumeric(32);
  const newLastVerifiedAt = new Date().toISOString();
  const updateInput: IShoppingMallAiBackendCustomerExternalIdentity.IUpdate = {
    provider_key: newProviderKey,
    last_verified_at: newLastVerifiedAt,
  };
  const updated =
    await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.update(
      connection,
      {
        customerId: customerId,
        externalIdentityId: fakeIdentity.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "response provider_key updated",
    updated.provider_key,
    newProviderKey,
  );
  TestValidator.equals(
    "response last_verified_at updated",
    updated.last_verified_at,
    newLastVerifiedAt,
  );
  TestValidator.equals("response id matches", updated.id, fakeIdentity.id);
  TestValidator.equals(
    "response customer_id matches",
    updated.customer_id,
    customerId,
  );

  // 4. Ensure non-updated fields remain the same
  TestValidator.equals(
    "response provider unchanged",
    updated.provider,
    fakeIdentity.provider,
  );
  TestValidator.equals(
    "response linked_at unchanged",
    updated.linked_at,
    fakeIdentity.linked_at,
  );

  // 5. Register (join) a second customer
  const joinInputB: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authorizedB = await api.functional.auth.customer.join(connection, {
    body: joinInputB,
  });
  typia.assert(authorizedB);
  const customerIdB = typia.assert(authorizedB.customer.id);

  // 6. Switch connection context to second customer
  // (SDK auto-updates token on join)

  // 7. Attempt forbidden update as another user
  await TestValidator.error(
    "forbidden: other customer cannot update",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.update(
        connection,
        {
          customerId: customerId,
          externalIdentityId: fakeIdentity.id,
          body: {
            provider_key: RandomGenerator.alphaNumeric(32),
          },
        },
      );
    },
  );

  // 8. Attempt to update a non-existent external identity
  await TestValidator.error(
    "not found: update missing external identity fails",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.update(
        connection,
        {
          customerId: customerIdB,
          externalIdentityId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            provider_key: RandomGenerator.alphaNumeric(32),
          },
        },
      );
    },
  );
}
