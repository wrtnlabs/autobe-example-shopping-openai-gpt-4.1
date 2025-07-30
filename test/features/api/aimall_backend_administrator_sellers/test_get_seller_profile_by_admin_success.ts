import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate administrator ability to fetch specific seller details by sellerId.
 *
 * Business context: Admin users must be able to retrieve full seller/merchant
 * details by sellerId, including business identifying info and contact details
 * to manage or audit merchant accounts.
 *
 * This test ensures:
 *
 * - All seller fields are correctly returned (business_name, email,
 *   contact_phone, status, id, creation/modification timestamps)
 * - Returned data exactly matches what was registered
 * - Required formats (UUID, email, ISO date-time) are respected
 * - A non-existent sellerId yields a proper 404 error
 *
 * Step-by-step process:
 *
 * 1. Admin creates a new seller so there is valid sellerId to test with
 * 2. Admin requests seller details using sellerId and validates: a. All expected
 *    fields are present b. Data matches what was created c. Field formats and
 *    timestamps are valid
 * 3. Admin requests details for a random (non-existent) sellerId and gets 404
 *    error
 */
export async function test_api_aimall_backend_administrator_sellers_test_get_seller_profile_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a new seller for admin retrieval test
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: "테스트 사업자",
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: "010-9876-1234",
    status: "pending",
  };
  const created: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(created);
  // 2. Retrieve the seller by their id as admin
  const fetched: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.at(connection, {
      sellerId: created.id,
    });
  typia.assert(fetched);
  // 2a. Validate all required fields
  TestValidator.equals("id matches")(fetched.id)(created.id);
  TestValidator.equals("business_name")(fetched.business_name)(
    sellerInput.business_name,
  );
  TestValidator.equals("email")(fetched.email)(sellerInput.email);
  TestValidator.equals("contact_phone")(fetched.contact_phone)(
    sellerInput.contact_phone,
  );
  TestValidator.equals("status")(fetched.status)(sellerInput.status);
  TestValidator.predicate("created_at is ISO date-time")(
    !!Date.parse(fetched.created_at),
  );
  TestValidator.predicate("updated_at is ISO date-time")(
    !!Date.parse(fetched.updated_at),
  );
  // 3. Try to fetch a non-existent seller (should fail with 404 or error)
  await TestValidator.error("not found for invalid sellerId")(() =>
    api.functional.aimall_backend.administrator.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
