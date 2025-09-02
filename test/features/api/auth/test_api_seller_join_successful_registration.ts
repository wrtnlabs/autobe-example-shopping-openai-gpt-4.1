import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_join_successful_registration(
  connection: api.IConnection,
) {
  /**
   * Validates that new seller registration is successful, that the returned
   * profile matches the input, and that the API returns a valid token structure
   * and active seller account.
   *
   * Steps:
   *
   * 1. Prepare unique, valid seller registration input data (email, business
   *    registration number, name)
   * 2. Call the seller registration endpoint (/auth/seller/join)
   * 3. Assert that a valid JWT auth token is returned (access/refresh/expiration
   *    fields)
   * 4. Assert that the seller profile reflects the provided input, is_active is
   *    true, and deleted_at is null/undefined
   * 5. Assert that the returned access token was attached to
   *    connection.headers.Authorization for future API calls
   */

  // 1. Prepare unique, valid test input for seller registration
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const business_registration_number: string = `BRN-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const name: string = RandomGenerator.name(2);
  const input = {
    email,
    business_registration_number,
    name,
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  // 2. Call seller registration endpoint (public, no auth setup needed)
  const result: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: input,
    });
  typia.assert(result);

  // 3. Validate auth token structure and all fields present
  typia.assert(result.token);
  TestValidator.predicate(
    "access and refresh tokens must be issued",
    !!result.token.access &&
      !!result.token.refresh &&
      !!result.token.expired_at &&
      !!result.token.refreshable_until,
  );

  // 4. Validate returned seller profile matches input and status is active/not deleted
  typia.assert(result.seller);
  TestValidator.equals(
    "seller email matches input",
    result.seller.email,
    email,
  );
  TestValidator.equals(
    "business registration number matches input",
    result.seller.business_registration_number,
    business_registration_number,
  );
  TestValidator.equals("seller name matches input", result.seller.name, name);
  TestValidator.predicate(
    "seller account is active",
    result.seller.is_active === true,
  );
  TestValidator.predicate(
    "seller not soft-deleted",
    result.seller.deleted_at === null || result.seller.deleted_at === undefined,
  );

  // 5. Check access token attached to Authorization header (side effect)
  TestValidator.equals(
    "access token in Authorization header matches output",
    connection.headers?.Authorization,
    result.token.access,
  );
}
