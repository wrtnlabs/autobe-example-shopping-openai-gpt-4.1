import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";

export async function test_api_admin_customer_external_identity_detail_success(
  connection: api.IConnection,
) {
  /**
   * Test that an authenticated admin user can retrieve a specific customer's
   * external identity details using the admin API endpoint.
   *
   * Workflow:
   *
   * 1. Register a new admin and use the returned Authorization token for admin
   *    access to protected endpoints.
   * 2. Register a new customer, recording their customer_id for external identity
   *    linkage.
   * 3. Manually synthesize an external identity (since there is no API for
   *    creation), assigning it to the customer.
   * 4. Use admin credentials to call GET
   *    /shoppingMallAiBackend/admin/customers/{customerId}/externalIdentities/{externalIdentityId}
   *    with valid IDs.
   * 5. Assert that the returned entity matches the simulated record
   *    (field-by-field) using TestValidator.equals and typia.assert.
   * 6. Execute negative scenarios: bad externalIdentityId and bad customerId
   *    (expect error).
   */

  // 1. Register and authenticate as admin
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // simulated hash
  const adminEmail: string = `${RandomGenerator.alphabets(7)}@example.com`;
  const adminName: string = RandomGenerator.name();
  const adminPhone: string = RandomGenerator.mobile();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin is_active true", adminJoin.admin.is_active, true);

  // 2. Register a new customer
  const customerEmail: string = `${RandomGenerator.alphabets(8)}@customer.com`;
  const customerPhone: string = RandomGenerator.mobile();
  const customerName: string = RandomGenerator.name();
  const customerNickname: string = RandomGenerator.name(1);
  const customerPassword: string = RandomGenerator.alphaNumeric(12);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
      nickname: customerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customer = customerJoin.customer;

  // 3. Synthesize (mock) an external identity assigned to this customer
  const providerOptions = ["google", "apple", "naver", "kakao"] as const;
  const externalIdentity: IShoppingMallAiBackendCustomerExternalIdentity = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: customer.id,
    provider: RandomGenerator.pick(providerOptions),
    provider_key: RandomGenerator.alphaNumeric(20),
    linked_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  };

  // 4. As admin, retrieve the external identity via API
  const fetchedIdentity =
    await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.at(
      connection,
      {
        customerId: externalIdentity.customer_id,
        externalIdentityId: externalIdentity.id,
      },
    );
  typia.assert(fetchedIdentity);
  TestValidator.equals(
    "customer_id matches",
    fetchedIdentity.customer_id,
    externalIdentity.customer_id,
  );
  TestValidator.equals(
    "provider matches",
    fetchedIdentity.provider,
    externalIdentity.provider,
  );
  TestValidator.equals(
    "provider_key matches",
    fetchedIdentity.provider_key,
    externalIdentity.provider_key,
  );
  TestValidator.equals(
    "linked_at matches",
    fetchedIdentity.linked_at,
    externalIdentity.linked_at,
  );
  TestValidator.equals(
    "last_verified_at matches",
    fetchedIdentity.last_verified_at,
    externalIdentity.last_verified_at,
  );

  // 5. Negative scenario: Random externalIdentityId that shouldn't exist
  await TestValidator.error(
    "invalid externalIdentityId returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.at(
        connection,
        {
          customerId: externalIdentity.customer_id,
          externalIdentityId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Negative scenario: Random unrelated customerId
  await TestValidator.error("invalid customerId returns error", async () => {
    await api.functional.shoppingMallAiBackend.admin.customers.externalIdentities.at(
      connection,
      {
        customerId: typia.random<string & tags.Format<"uuid">>(),
        externalIdentityId: externalIdentity.id,
      },
    );
  });
}
