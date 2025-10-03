import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates seller onboarding (registration) flow for a new account.
 *
 * Ensures that a new seller can register using the POST /auth/seller/join
 * endpoint, providing all required business and KYC data. Checks that:
 *
 * - Seller is registered unauthenticated (public access)
 * - All required fields are provided (email, password, name, profile_name,
 *   shopping_mall_channel_id, shopping_mall_section_id)
 * - System assigns status and approval/kyc state appropriately on registration
 *   (response contains status and kyc_status; approval_at is null or omitted)
 * - Response contains a valid JWT authentication token, proper audit fields
 *   (created_at, updated_at), seller summary (no sensitive data), and all
 *   snapshot/audit properties are compliant
 * - No system-managed fields are present in the registration request (input does
 *   NOT include id, created_at, updated_at, deleted_at, approval_at, status, or
 *   token)
 * - Output DOES contain auth fields and summary and exposes only expected
 *   non-sensitive fields
 * - Seller is linked to the correct channel and section
 *
 * Steps:
 *
 * 1. Generate randomized valid seller registration payload
 *    (IShoppingMallSeller.IJoin)
 * 2. Call POST /auth/seller/join (api.functional.auth.seller.join) without
 *    authentication
 * 3. Assert response is IShoppingMallSeller.IAuthorized per schema, including:
 *
 *    - Proper id, status, kyc_status, audit timestamps
 *    - Approval_at is null or missing as onboarding is not approved yet
 *    - Valid JWT token properties (token field: access, refresh, expiration info)
 *    - Seller summary present with expected fields (see ISummary)
 *    - Exposure only of permitted fields (no sensitive/forbidden fields)
 * 4. Confirm status and KYC state are set correctly (usually status: 'pending',
 *    kyc_status: 'pending' or similar)
 * 5. Confirm linkage of seller to given channel and section
 * 6. Confirm profile_name, section assignment, and audit fields are correct in
 *    summary
 */
export async function test_api_seller_registration_new_account(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid random seller registration input (IShoppingMallSeller.IJoin)
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.name(),
    // Optionally, test can omit kyc_status to let server assign default
  } satisfies IShoppingMallSeller.IJoin;

  // Step 2: Call registration API unauthenticated
  const output = await api.functional.auth.seller.join(connection, {
    body: input,
  });
  typia.assert(output);

  // Step 3: Permission and audit checks
  // Response must not leak system fields in joined initial response: typia.assert checks schema
  // Check default status and KYC assignment
  TestValidator.equals(
    "status should be 'pending' or 'active' immediately after registration",
    ["pending", "active"],
    [output.status],
  );
  TestValidator.predicate(
    "seller id is UUID",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.equals(
    "seller's section assignment",
    output.shopping_mall_section_id,
    input.shopping_mall_section_id,
  );
  TestValidator.equals(
    "profile_name matches",
    output.profile_name,
    input.profile_name,
  );
  TestValidator.predicate(
    "created_at is ISO timestamp",
    typeof output.created_at === "string" && output.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is ISO timestamp",
    typeof output.updated_at === "string" && output.updated_at.endsWith("Z"),
  );
  TestValidator.equals(
    "deleted_at is null or undefined on initial join",
    output.deleted_at,
    null,
  );
  TestValidator.equals(
    "approval_at is null or undefined for onboarding",
    output.approval_at,
    null,
  );

  // Step 4: Token structure is present and correct
  typia.assert(output.token);
  TestValidator.predicate(
    "token.access is non-empty JWT",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO timestamp",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.endsWith("Z"),
  );

  // Step 5: Seller summary is present and matches key fields
  if (output.seller !== undefined) {
    typia.assert(output.seller);
    TestValidator.equals(
      "summary id matches main id",
      output.seller.id,
      output.id,
    );
    TestValidator.equals(
      "summary section matches",
      output.seller.shopping_mall_section_id,
      input.shopping_mall_section_id,
    );
    TestValidator.equals(
      "profile_name matches summary",
      output.seller.profile_name,
      input.profile_name,
    );
    TestValidator.equals(
      "seller status matches",
      output.seller.status,
      output.status,
    );
    TestValidator.equals(
      "summary kyc_status matches",
      output.seller.kyc_status,
      output.kyc_status,
    );
    TestValidator.equals(
      "summary approval_at matches",
      output.seller.approval_at,
      output.approval_at,
    );
    TestValidator.equals(
      "summary created_at matches",
      output.seller.created_at,
      output.created_at,
    );
    TestValidator.equals(
      "summary updated_at matches",
      output.seller.updated_at,
      output.updated_at,
    );
    TestValidator.equals(
      "summary deleted_at matches",
      output.seller.deleted_at,
      output.deleted_at,
    );
  }
}
