import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate that creating a seller with missing required fields fails.
 *
 * Business goal: Confirm that the seller registration endpoint strictly
 * enforces schema validation and does not accept requests with missing
 * mandatory fields. This is critical for data integrity and user feedback on
 * form submission.
 *
 * Step-by-step process:
 *
 * 1. Attempt to create a seller with 'business_name' missing, but other required
 *    fields present.
 *
 *    - Expect: API returns a 400 Bad Request or validation error indicating
 *         'business_name' is required.
 *    - Assert: Seller is NOT created, error is thrown.
 * 2. Attempt to create a seller with 'email' missing, but other required fields
 *    present.
 *
 *    - Expect: API returns a 400 Bad Request or validation error indicating 'email'
 *         is required.
 *    - Assert: Seller is NOT created, error is thrown.
 * 3. Attempt to create a seller with both 'business_name' and 'email' missing.
 *
 *    - Expect: API returns a 400 Bad Request or validation error indicating both
 *         fields are required.
 *    - Assert: Seller is NOT created, error is thrown.
 * 4. Control: Attempt to create a valid seller with all fields provided.
 *
 *    - Expect: API creates the seller and returns the new seller record.
 *    - Assert: Response object has expected values and mandatory fields are present.
 */
export async function test_api_sellers_test_create_seller_with_missing_required_fields_fails(
  connection: api.IConnection,
) {
  // 1. Attempt with 'business_name' missing
  await TestValidator.error("missing business_name should fail")(() =>
    api.functional.aimall_backend.administrator.sellers.create(connection, {
      body: {
        // business_name is intentionally omitted
        email: typia.random<string & tags.Format<"email">>(),
        contact_phone: "010-1234-5678",
        status: "pending",
      } as any, // Only for purposeful runtime schema validation error
    }),
  );

  // 2. Attempt with 'email' missing
  await TestValidator.error("missing email should fail")(() =>
    api.functional.aimall_backend.administrator.sellers.create(connection, {
      body: {
        business_name: "My Test Business",
        // email is intentionally omitted
        contact_phone: "010-1234-5678",
        status: "pending",
      } as any,
    }),
  );

  // 3. Attempt with both 'business_name' and 'email' missing
  await TestValidator.error("missing both business_name and email should fail")(
    () =>
      api.functional.aimall_backend.administrator.sellers.create(connection, {
        body: {
          // business_name and email both missing
          contact_phone: "010-1234-5678",
          status: "pending",
        } as any,
      }),
  );

  // 4. As a control, create a valid seller
  const validSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Valid Biz",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: "010-5678-1234",
          status: "pending",
        },
      },
    );
  typia.assert(validSeller);
  TestValidator.equals("business_name present")(validSeller.business_name)(
    "Valid Biz",
  );
}
