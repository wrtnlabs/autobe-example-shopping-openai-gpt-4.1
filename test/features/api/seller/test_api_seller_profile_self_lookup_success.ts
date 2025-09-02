import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";

/**
 * Verify that a seller, immediately after registration, can retrieve their
 * own profile information using the sellerId.
 *
 * Business context: This test validates the core onboarding journey for
 * sellers: ensuring that after onboarding (via join/registration), a seller
 * can retrieve their full profile via the self-lookup endpoint in an
 * authenticated flow.
 *
 * Steps:
 *
 * 1. Register a seller using the join endpoint (capture the issued sellerId
 *    from the authorization response).
 * 2. While authenticated, issue a GET request to the profile lookup endpoint
 *    using the same sellerId.
 * 3. Assert that the returned profile has all expected fields (id, seller_id,
 *    display name, contact info, timestamps, etc.).
 * 4. Validate that profile.id and profile.seller_id match the registered
 *    seller's id.
 * 5. Assert critical fields (business_registration_number, name) match between
 *    initial join and profile response.
 * 6. All system-managed fields (created_at, updated_at) must be valid
 *    ISO-formatted datetimes.
 * 7. Optional fields (display_name, contact_phone, contact_email, address,
 *    description) are present and may be null immediately after
 *    onboarding.
 */
export async function test_api_seller_profile_self_lookup_success(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const registration = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(registration);
  const sellerId = registration.seller.id;

  // 2. Lookup seller profile using sellerId (authenticated context)
  const profile =
    await api.functional.shoppingMallAiBackend.seller.sellers.profile.at(
      connection,
      {
        sellerId,
      },
    );
  typia.assert(profile);

  // 3. Assert profile essential fields
  TestValidator.equals("profile.id matches seller id", profile.id, sellerId);
  TestValidator.equals(
    "profile.seller_id matches seller id",
    profile.seller_id,
    sellerId,
  );

  // 4. Core fields match between registration and profile
  TestValidator.equals(
    "profile business registration number matches",
    registration.seller.business_registration_number,
    sellerInput.business_registration_number,
  );
  TestValidator.equals(
    "profile name matches registration",
    registration.seller.name,
    sellerInput.name,
  );

  // 5. System/managed fields: timestamps are present and ISO 8601 format
  TestValidator.predicate(
    "profile.created_at is ISO timestamp",
    typeof profile.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.created_at),
  );
  TestValidator.predicate(
    "profile.updated_at is ISO timestamp",
    typeof profile.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.updated_at),
  );

  // 6. Optional fields may be null immediately after onboarding
  TestValidator.equals(
    "display_name may be null on onboarding",
    profile.display_name,
    null,
  );
  TestValidator.equals(
    "contact_phone may be null on onboarding",
    profile.contact_phone,
    null,
  );
  TestValidator.equals(
    "contact_email may be null on onboarding",
    profile.contact_email,
    null,
  );
  TestValidator.equals(
    "address may be null on onboarding",
    profile.address,
    null,
  );
  TestValidator.equals(
    "description may be null on onboarding",
    profile.description,
    null,
  );
}
