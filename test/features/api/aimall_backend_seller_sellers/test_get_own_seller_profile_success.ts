import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test retrieval of a seller's own profile details
 *
 * This test validates that a seller who has a valid merchant account can
 * request their own seller profile information by invoking GET
 * /aimall-backend/seller/sellers/{sellerId}. The API should return all profile
 * fields for the authenticated seller, including id, business_name, email,
 * contact_phone, status, created_at, and updated_at. It must return ONLY the
 * correct seller (matching the token/sellerId used), and no other account's
 * data should be visible.
 *
 * Test workflow:
 *
 * 1. Create a new seller via admin onboarding (using
 *    /aimall-backend/administrator/sellers)
 * 2. Using the created seller's id, access GET
 *    /aimall-backend/seller/sellers/{sellerId}
 * 3. Assert all returned fields match the created seller's properties
 * 4. Ensure no fields are missing or contain data from other accounts
 */
export async function test_api_aimall_backend_seller_sellers_test_get_own_seller_profile_success(
  connection: api.IConnection,
) {
  // 1. Create a seller via onboarding (admin call)
  const createInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    contact_phone:
      "010-5555-" + (1000 + Math.floor(Math.random() * 9000)).toString(),
    status: "approved",
  };
  const created: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);
  // 2. Retrieve seller profile using the created seller's id
  const profile: IAimallBackendSeller =
    await api.functional.aimall_backend.seller.sellers.at(connection, {
      sellerId: created.id,
    });
  typia.assert(profile);
  // 3. Assert each field matches the created seller
  TestValidator.equals("id")(profile.id)(created.id);
  TestValidator.equals("business_name")(profile.business_name)(
    created.business_name,
  );
  TestValidator.equals("email")(profile.email)(created.email);
  TestValidator.equals("contact_phone")(profile.contact_phone)(
    created.contact_phone,
  );
  TestValidator.equals("status")(profile.status)(created.status);
  // 4. Ensure timestamps are present
  TestValidator.predicate("created_at present")(!!profile.created_at);
  TestValidator.predicate("updated_at present")(!!profile.updated_at);
}
