import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_seller_cart_creation_success(
  connection: api.IConnection,
) {
  /**
   * Test that a registered seller can successfully create a shopping cart, and
   * result fields are valid.
   *
   * Steps:
   *
   * 1. Register a new seller via the /auth/seller/join endpoint (dependency). This
   *    establishes seller authentication.
   * 2. Use the authenticated connection to invoke the cart creation endpoint
   *    (/shoppingMallAiBackend/seller/carts) with a properly structured request
   *    object.
   * 3. Validate the returned cart object: check correct UUID format for id;
   *    confirm that shopping_mall_ai_backend_customer_id and
   *    shopping_mall_ai_backend_customer_session_id are both null; status field
   *    is present and non-empty; cart_token is present and matches the
   *    submitted value; timestamps are ISO8601 and logically present; cart is
   *    not deleted or merged; and all required business fields are populated.
   * 4. Assert that the cart returned is a new resource (not reused), all
   *    identities are unique across test execution, and fields are consistent
   *    with input/request where applicable.
   */

  // 1. Register the seller (and acquire authentication context)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Prepare valid seller cart creation request
  const cartToken = RandomGenerator.alphaNumeric(24);
  const status = "active";
  const cartInput = {
    cart_token: cartToken,
    status,
    // all other properties left unset (member-related/null)
  } satisfies IShoppingMallAiBackendCart.ICreate;

  const cart = await api.functional.shoppingMallAiBackend.seller.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 3. Field validity and business logic validations
  TestValidator.predicate(
    "cart id is a uuid",
    typeof cart.id === "string" && /^[0-9a-fA-F-]{36}$/.test(cart.id),
  );
  TestValidator.equals("cart token matches input", cart.cart_token, cartToken);
  TestValidator.equals("cart status matches input", cart.status, status);
  TestValidator.equals(
    "customer id is null (seller cart)",
    cart.shopping_mall_ai_backend_customer_id,
    null,
  );
  TestValidator.equals(
    "session id is null (seller cart)",
    cart.shopping_mall_ai_backend_customer_session_id,
    null,
  );
  TestValidator.predicate(
    "created_at and updated_at are valid ISO date-time",
    typeof cart.created_at === "string" &&
      typeof cart.updated_at === "string" &&
      !isNaN(Date.parse(cart.created_at)) &&
      !isNaN(Date.parse(cart.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null (cart active)",
    cart.deleted_at,
    null,
  );
  TestValidator.predicate(
    "cart note is null or string (nullable) and not required",
    cart.note === null || typeof cart.note === "string",
  );
  TestValidator.predicate(
    "expires_at is null or valid ISO date-time (nullable)",
    cart.expires_at === null ||
      (typeof cart.expires_at === "string" &&
        !isNaN(Date.parse(cart.expires_at))),
  );
  TestValidator.equals(
    "last_merged_at is null for new cart",
    cart.last_merged_at,
    null,
  );
}
