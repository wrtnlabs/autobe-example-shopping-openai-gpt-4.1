import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_seller_favorite_creation_missing_required_field_failure(
  connection: api.IConnection,
) {
  /**
   * Tests backend validation: favorite creation must fail if required fields
   * are missing.
   *
   * Business context:
   *
   * - APIs must guarantee that incomplete, malformed requests (missing core
   *   required fields) never create records.
   * - This test demonstrates strict request validation by simulating a request
   *   with a missing required field ('target_type'), a core business
   *   identifier.
   *
   * Steps:
   *
   * 1. Register (join) a seller to obtain an authenticated context (token managed
   *    by SDK).
   * 2. Build a favorite creation payload that omits 'target_type' (required by
   *    ICreate), intentionally triggering server-side validation error.
   * 3. Call the API and expect a validation error (error thrown, no record
   *    created).
   *
   * Note: This negative test forcibly bypasses TypeScript static checking ONLY
   * for the negative validation path, using 'as unknown as
   * IShoppingMallAiBackendFavorite.ICreate'. Production code should never use
   * this anti-pattern except in such explicit API negative tests. All
   * properties included match actual DTOs (no fake fields).
   */
  // 1. Seller registration
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuth);
  const customer_id = sellerAuth.seller.id;

  // 2. Build payload missing 'target_type' (required)
  const incompletePayload = {
    shopping_mall_ai_backend_customer_id: customer_id,
    // missing target_type intentionally
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
    target_id_snapshot: RandomGenerator.alphaNumeric(10),
  } as unknown as IShoppingMallAiBackendFavorite.ICreate;

  // 3. Attempt creation and expect a validation error
  await TestValidator.error(
    "API should reject favorite creation when required field (target_type) is missing",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.favorites.create(
        connection,
        {
          body: incompletePayload,
        },
      );
    },
  );
}
