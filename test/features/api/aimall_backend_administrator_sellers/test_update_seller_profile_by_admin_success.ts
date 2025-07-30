import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * E2E: Administrator updates a seller’s profile with new information.
 *
 * This test simulates the full flow of an admin onboard-and-edit lifecycle:
 *
 * 1. Register a new seller with valid details (admin onboarding).
 * 2. As admin, update multiple fields for the seller (business name, email,
 *    contact phone, status, and updated_at).
 * 3. Validate API response for each changed field.
 * 4. Confirm changes persist by calling update again with the same values
 *    (idempotency check).
 *
 * Validates:
 *
 * - POST /aimall-backend/administrator/sellers (seller registration)
 * - PUT /aimall-backend/administrator/sellers/{sellerId} (admin update)
 */
export async function test_api_aimall_backend_administrator_sellers_test_update_seller_profile_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a seller with standard details
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "TestCorp Ltd.",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: "010-1234-5678",
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Prepare new values for update
  const updateInput: IAimallBackendSeller.IUpdate = {
    business_name: "UpdatedCorp Inc.",
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: "010-5678-1234",
    status: "approved",
    updated_at: new Date().toISOString(),
  };

  // 3. Admin updates seller information
  const updated: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.update(
      connection,
      {
        sellerId: seller.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Validate the returned seller matches the new data
  TestValidator.equals("business_name")(updated.business_name)(
    updateInput.business_name,
  );
  TestValidator.equals("email")(updated.email)(updateInput.email);
  TestValidator.equals("contact_phone")(updated.contact_phone)(
    updateInput.contact_phone,
  );
  TestValidator.equals("status")(updated.status)(updateInput.status);

  // 5. Confirm persistence by calling update again with the same input
  const check: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.update(
      connection,
      {
        sellerId: seller.id,
        body: updateInput,
      },
    );
  typia.assert(check);
  TestValidator.equals("idempotent business_name")(check.business_name)(
    updateInput.business_name,
  );
}
