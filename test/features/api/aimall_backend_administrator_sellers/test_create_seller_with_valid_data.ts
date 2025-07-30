import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test successful creation of a new seller/merchant account via the
 * administrator onboarding endpoint.
 *
 * This test simulates the merchant onboarding workflow:
 *
 * 1. Generates realistic business and contact data per
 *    IAimallBackendSeller.ICreate
 * 2. Calls the create API endpoint to register the new seller
 * 3. Asserts that the response matches the input for core fields
 * 4. Validates the returned entity's id, created_at, and updated_at fields
 *
 * (Audit log verification omitted – no API available for audit logs)
 */
export async function test_api_aimall_backend_administrator_sellers_test_create_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Prepare valid seller input according to IAimallBackendSeller.ICreate
  const input: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };

  // 2. Create the new seller via administrator API
  const output: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: input },
    );
  typia.assert(output);

  // 3. Assert core fields match input
  TestValidator.equals("business_name matches")(output.business_name)(
    input.business_name,
  );
  TestValidator.equals("email matches")(output.email)(input.email);
  TestValidator.equals("contact_phone matches")(output.contact_phone)(
    input.contact_phone,
  );
  TestValidator.equals("status matches")(output.status)(input.status);

  // 4. Validate id and timestamps are properly present and formatted
  TestValidator.predicate("id is present and string")(
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.predicate("created_at is valid datetime")(
    typeof output.created_at === "string" && !!Date.parse(output.created_at),
  );
  TestValidator.predicate("updated_at is valid datetime")(
    typeof output.updated_at === "string" && !!Date.parse(output.updated_at),
  );

  // Audit log validation step omitted
}
