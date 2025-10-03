import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerIdentity";

/**
 * Test updating a customer's identity (KYC) status as an admin.
 *
 * 1. Register an admin using /auth/admin/join (establish admin auth).
 * 2. (Simulated) Prepare valid random customerId and identityId (simulate since
 *    API has no creation endpoint).
 * 3. Update the identity's status field from 'pending' to 'verified', validate
 *    returned object reflects changes, and created_at/updated_at are
 *    different.
 * 4. Attempt update that should be forbidden by compliance rules (e.g.,
 *    verified→pending), ensure error is thrown.
 * 5. Attempt update with non-existent identityId and ensure result is error.
 * 6. Attempt update as non-admin (simulate by wiping token), ensure error.
 * 7. For successful case, updated status must show and updated_at must be more
 *    recent.
 */
export async function test_api_admin_customer_identity_update_kyc_status(
  connection: api.IConnection,
) {
  // 1. Register an admin (obtain auth and token)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Prepare random IDs (simulate, as there's no creation for identity)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const identityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Update identity status from 'pending' to 'verified'
  const pendingStatus = "pending";
  const verifiedStatus = "verified";

  // First: pretend previous state is pending (simulate, since read API missing)
  const firstUpdate =
    await api.functional.shoppingMall.admin.customers.identities.update(
      connection,
      {
        customerId,
        identityId,
        body: {
          status: pendingStatus,
        } satisfies IShoppingMallCustomerIdentity.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "status updated to pending",
    firstUpdate.status,
    pendingStatus,
  );
  const beforeUpdatedAt = firstUpdate.updated_at;

  // Now: update status to 'verified'
  const verifiedUpdate =
    await api.functional.shoppingMall.admin.customers.identities.update(
      connection,
      {
        customerId,
        identityId,
        body: {
          status: verifiedStatus,
        } satisfies IShoppingMallCustomerIdentity.IUpdate,
      },
    );
  typia.assert(verifiedUpdate);
  TestValidator.equals(
    "status updated to verified",
    verifiedUpdate.status,
    verifiedStatus,
  );
  TestValidator.notEquals(
    "updated_at changed",
    verifiedUpdate.updated_at,
    beforeUpdatedAt,
  );

  // 4. Attempt forbidden transition (verified→pending)
  await TestValidator.error(
    "cannot transition from verified to pending",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.update(
        connection,
        {
          customerId,
          identityId,
          body: {
            status: pendingStatus,
          } satisfies IShoppingMallCustomerIdentity.IUpdate,
        },
      );
    },
  );

  // 5. Non-existent identityId is error
  await TestValidator.error(
    "updating non-existent identity fails",
    async () => {
      await api.functional.shoppingMall.admin.customers.identities.update(
        connection,
        {
          customerId,
          identityId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: verifiedStatus,
          } satisfies IShoppingMallCustomerIdentity.IUpdate,
        },
      );
    },
  );

  // 6. As non-admin (simulate by emptying token, or use simulate mode)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized user cannot update KYC", async () => {
    await api.functional.shoppingMall.admin.customers.identities.update(
      unauthConn,
      {
        customerId,
        identityId,
        body: {
          status: verifiedStatus,
        } satisfies IShoppingMallCustomerIdentity.IUpdate,
      },
    );
  });
}
