import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import type { IAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItem";
import type { IAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItemOption";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Test retrieval of a buyer's cart item details using GET
 * /aiCommerce/buyer/carts/{cartId}/items/{cartItemId}
 *
 * Business context: Validates the workflow of buyer onboarding through cart
 * and cart item creation, then fetches the cart item to confirm details
 * match exactly. Ensures IDs are created through required dependency flows
 * and that cart item detail retrieval is accurate for the buyer.
 *
 * Steps:
 *
 * 1. Register a buyer with unique credentials (auth.buyer.join).
 * 2. Create a cart for the buyer (aiCommerce.buyer.carts.create).
 * 3. Add a new cart item to that cart (aiCommerce.buyer.carts.items.create).
 * 4. Retrieve details of the specific cart item
 *    (aiCommerce.buyer.carts.items.at).
 * 5. Validate all IDs are wired through previous steps and that the result
 *    exactly matches the created item.
 */
export async function test_api_cart_item_at_success_retrieve_cart_item(
  connection: api.IConnection,
) {
  // 1. Register a buyer
  const buyerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IBuyer.ICreate;
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: buyerCredentials,
  });
  typia.assert(buyerAuth);

  // 2. Create a cart linked to this buyer
  const cartBody = {
    buyer_id: buyerAuth.id,
  } satisfies IAiCommerceCart.ICreate;
  const cart = await api.functional.aiCommerce.buyer.carts.create(connection, {
    body: cartBody,
  });
  typia.assert(cart);

  // 3. Create a new cart item under this cart
  const cartItemBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    // variant_id and options are omitted for simplicity and generality
  } satisfies IAiCommerceCartItem.ICreate;
  const cartItem = await api.functional.aiCommerce.buyer.carts.items.create(
    connection,
    {
      cartId: cart.id,
      body: cartItemBody,
    },
  );
  typia.assert(cartItem);

  // 4. Retrieve the cart item detail
  const cartItemFetched = await api.functional.aiCommerce.buyer.carts.items.at(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
    },
  );
  typia.assert(cartItemFetched);

  // 5. Validate all IDs, and that the fetched record exactly matches what was just created
  TestValidator.equals(
    "cartId from GET matches created cart",
    cartItemFetched.cart_id,
    cart.id,
  );
  TestValidator.equals(
    "cartItemId from GET matches created item",
    cartItemFetched.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart item snapshot from GET matches creation (excluding updated_at/added_at)",
    { ...cartItem, added_at: undefined, updated_at: undefined },
    { ...cartItemFetched, added_at: undefined, updated_at: undefined },
    (key) => key === "added_at" || key === "updated_at",
  );
}

/**
 * - All required business and technical flows are implemented end-to-end: buyer
 *   join, cart creation, cart item creation, and retrieval
 * - Correct DTO types are used at every API call. No type errors present. No 'as
 *   any', no Partial, no missing required fields
 * - Every API SDK function call uses await
 * - All TestValidator functions use descriptive titles as the first argument
 * - No additional imports or template modifications are present
 * - Random data generation is provided for unique email/password and product_id,
 *   ensuring uniqueness and realism
 * - The comparison of cartItem vs. cartItemFetched copies (excluding dynamic
 *   updated_at/added_at fields) is correct for snapshot matching as direct
 *   equality of audits may differ depending on internal implementation
 * - No forbidden anti-patterns (no type error testing, no status code validation,
 *   no business logic violations)
 * - Final code differs from the template as all required steps are implemented
 * - All critical checklist points from the guidelines are respected. There is no
 *   scenario logic not implementable with provided API.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O ZERO TypeScript compilation errors
 */
const __revise = {};
__revise;
