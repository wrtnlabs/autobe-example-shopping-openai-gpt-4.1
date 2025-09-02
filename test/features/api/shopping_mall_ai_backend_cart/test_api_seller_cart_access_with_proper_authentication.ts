import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

/**
 * Validate that a seller can fetch the details of their own cart after
 * registration.
 *
 * This test covers end-to-end seller cart workflow: registration,
 * authenticated cart creation, and verifying the seller can access the cart
 * by its unique id using proper role-based authentication. The test
 * confirms field population, business identity correctness, and
 * system-managed date values. Only valid, positive-flow is validated.
 *
 * Steps:
 *
 * 1. Register a new seller with unique email, business_registration_number,
 *    and name (auto-authenticates as seller)
 * 2. With authenticated session, create a new cart as the seller, using unique
 *    cart_token and status
 * 3. Fetch details for the newly created cart by id
 * 4. Assert that returned cart fields are fully populated and correctly
 *    reflect the creation input; check referential integrity and
 *    business-level constraints
 * 5. Validate core properties via direct equality checks and detailed
 *    field-level validation, including date fields as ISO-8601
 */
export async function test_api_seller_cart_access_with_proper_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerRegNo: string = RandomGenerator.alphaNumeric(10);
  const sellerName: string = RandomGenerator.name();
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: sellerEmail,
    business_registration_number: sellerRegNo,
    name: sellerName,
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a cart (authenticated context)
  const cartInput: IShoppingMallAiBackendCart.ICreate = {
    cart_token: RandomGenerator.alphaNumeric(15),
    status: "active",
  };
  const createdCart =
    await api.functional.shoppingMallAiBackend.seller.carts.create(connection, {
      body: cartInput,
    });
  typia.assert(createdCart);
  // 3. Seller fetches cart details by id
  const fetchedCart =
    await api.functional.shoppingMallAiBackend.seller.carts.at(connection, {
      cartId: createdCart.id,
    });
  typia.assert(fetchedCart);
  // 4. Assert field population and business rules
  TestValidator.equals(
    "created and fetched cart IDs match",
    fetchedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "cart_token matches input",
    fetchedCart.cart_token,
    cartInput.cart_token,
  );
  TestValidator.equals(
    "cart status is preserved",
    fetchedCart.status,
    cartInput.status,
  );
  TestValidator.equals(
    "customer_id should be null for seller cart",
    fetchedCart.shopping_mall_ai_backend_customer_id,
    null,
  );
  TestValidator.equals("cart not soft-deleted", fetchedCart.deleted_at, null);
  TestValidator.predicate(
    "created_at is ISO-8601 string",
    typeof fetchedCart.created_at === "string" &&
      fetchedCart.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO-8601 string",
    typeof fetchedCart.updated_at === "string" &&
      fetchedCart.updated_at.length > 0,
  );
  // 5. Core business fields deep equality (explicit)
  TestValidator.equals(
    "core business fields are consistent",
    {
      id: fetchedCart.id,
      shopping_mall_ai_backend_customer_id:
        fetchedCart.shopping_mall_ai_backend_customer_id,
      shopping_mall_ai_backend_customer_session_id:
        fetchedCart.shopping_mall_ai_backend_customer_session_id,
      cart_token: fetchedCart.cart_token,
      status: fetchedCart.status,
      expires_at: fetchedCart.expires_at,
      last_merged_at: fetchedCart.last_merged_at,
      note: fetchedCart.note,
      deleted_at: fetchedCart.deleted_at,
    },
    {
      id: createdCart.id,
      shopping_mall_ai_backend_customer_id:
        createdCart.shopping_mall_ai_backend_customer_id,
      shopping_mall_ai_backend_customer_session_id:
        createdCart.shopping_mall_ai_backend_customer_session_id,
      cart_token: createdCart.cart_token,
      status: createdCart.status,
      expires_at: createdCart.expires_at,
      last_merged_at: createdCart.last_merged_at,
      note: createdCart.note,
      deleted_at: createdCart.deleted_at,
    },
  );
}
