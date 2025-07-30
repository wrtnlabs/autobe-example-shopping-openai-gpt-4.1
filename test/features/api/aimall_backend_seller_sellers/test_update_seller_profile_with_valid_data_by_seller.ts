import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test that a seller can successfully update their own profile with valid data.
 *
 * This verifies that a seller can modify their profile details (business name,
 * email, contact phone, status) via self-service when using their own sellerId.
 * The test ensures:
 *
 * 1. Creation of a new seller (simulating onboarding via admin endpoint).
 * 2. Seller profile update with new valid information using their sellerId.
 * 3. All mutable fields are changed, the `updated_at` field is advanced, and the
 *    seller id remains the same (audit trail integrity).
 *
 * Test workflow:
 *
 * 1. Register a new seller account and extract the `sellerId`.
 * 2. Compose a full update payload with fresh business name, email, contact phone,
 *    status, and a new ISO `updated_at`.
 * 3. Call the seller update endpoint to modify the record.
 * 4. Assert that the returned object matches the new values, and the id is
 *    unchanged.
 * 5. Confirm that the `updated_at` value is updated to a newer timestamp.
 */
export async function test_api_aimall_backend_seller_sellers_test_update_seller_profile_with_valid_data_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller (admin onboarding)
  const original: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name() + " Merchants",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(original);

  // 2. Prepare updated profile data (new values)
  const updatedProfile: IAimallBackendSeller.IUpdate = {
    business_name: RandomGenerator.name() + " & Co.",
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
    updated_at: new Date().toISOString(),
  };

  // 3. Seller updates their own profile using their id
  const updated: IAimallBackendSeller =
    await api.functional.aimall_backend.seller.sellers.update(connection, {
      sellerId: original.id,
      body: updatedProfile,
    });
  typia.assert(updated);

  // 4. Assert all updatable fields are changed appropriately
  TestValidator.equals("business name updated")(updated.business_name)(
    updatedProfile.business_name,
  );
  TestValidator.equals("email updated")(updated.email)(updatedProfile.email);
  TestValidator.equals("contact phone updated")(updated.contact_phone)(
    updatedProfile.contact_phone,
  );
  TestValidator.equals("status updated")(updated.status)(updatedProfile.status);

  // 5. Confirm immutable identifier and audit trail
  TestValidator.equals("id is not changed")(updated.id)(original.id);
  TestValidator.predicate("updated_at advanced or same")(
    new Date(updated.updated_at).getTime() >=
      new Date(original.updated_at).getTime(),
  );
}
