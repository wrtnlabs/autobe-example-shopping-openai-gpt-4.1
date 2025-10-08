import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Validate customer profile update and boundaries with registration and reset
 * flow.
 *
 * 1. Create a new customer via join endpoint (with random personal details and
 *    address)
 * 2. Trigger password reset for the registered customer's email to simulate
 *    recovery/initiation
 * 3. Update customer's own non-protected profile fields (full_name and phone)
 *    using update API
 * 4. Retrieve result, assert fields updated, email/status/created_at not changed,
 *    and updated_at is recent
 * 5. Attempt to update another (new random) customerId (should fail with error)
 * 6. Simulate soft-deletion by updating main customer status to non-active and
 *    deleted_at to now, then attempt update (should fail) (Note: if direct
 *    soft-delete API does not exist, skip that case)
 */
export async function test_api_customer_profile_update_with_registration_flow(
  connection: api.IConnection,
) {
  // 1. Register new customer account
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 5,
        wordMax: 8,
      }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;

  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(auth);
  const customerId = auth.id;
  const originalProfile = auth;

  // 2. Password reset request
  const resetResp =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: customerJoinBody.email,
        },
      },
    );
  typia.assert(resetResp);
  TestValidator.equals("password reset accepted", resetResp.result, "accepted");

  // 3. Update own profile (name and phone only)
  const updateBody = {
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    // (intentionally omit status/email to ensure they are not changed)
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedProfile: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId,
      body: updateBody,
    });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "full_name updated",
    updatedProfile.full_name,
    updateBody.full_name,
  );
  TestValidator.equals("phone updated", updatedProfile.phone, updateBody.phone);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    originalProfile.email,
  );
  TestValidator.equals(
    "status unchanged",
    updatedProfile.status,
    originalProfile.status,
  );
  TestValidator.predicate(
    "updated_at is more recent",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(originalProfile.updated_at).getTime(),
  );

  // 4. Attempt to update another random, non-existent customer (should fail)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  if (randomId !== customerId) {
    await TestValidator.error("forbid updating another customer", async () => {
      await api.functional.shoppingMall.customer.customers.update(connection, {
        customerId: randomId,
        body: updateBody,
      });
    });
  }

  // 5. Attempt update on soft-deleted account (simulate deletion -- only if supported)
  // Here, since no direct delete/withdraw endpoint exists, skip this part.
}
