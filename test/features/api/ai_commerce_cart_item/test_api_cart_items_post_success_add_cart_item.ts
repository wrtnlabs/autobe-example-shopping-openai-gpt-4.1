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
 * Test successful addition of a cart item for a buyer.
 *
 * Scenario Steps:
 *
 * 1. Register a new buyer using /auth/buyer/join with random valid email and
 *    password.
 * 2. Create a new cart for the buyer using /aiCommerce/buyer/carts with the
 *    buyer's id as buyer_id.
 * 3. Generate a random payload for IAiCommerceCartItem.ICreate (must have
 *    product_id [random uuid] and quantity >= 1; variant_id/options are
 *    optional).
 * 4. Add a new item to the cart using /aiCommerce/buyer/carts/{cartId}/items
 *    with the cart id and the ICreate payload.
 * 5. Assert that the response is a valid IAiCommerceCartItem structure, with
 *    cart_id matching the created cart, and other fields are of correct
 *    type and value constraints (uuid, quantity, etc).
 * 6. Validate type safety with typia.assert() and logical/business linkage.
 */
export async function test_api_cart_items_post_success_add_cart_item(
  connection: api.IConnection,
) {
  // 1. Register new buyer for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email,
      password,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);
  TestValidator.equals("Buyer role must be 'buyer'", buyerAuth.role, "buyer");
  TestValidator.equals("Buyer id email matches", buyerAuth.email, email);

  // 2. Create a cart for this buyer
  const cart = await api.functional.aiCommerce.buyer.carts.create(connection, {
    body: {
      buyer_id: buyerAuth.id,
    } satisfies IAiCommerceCart.ICreate,
  });
  typia.assert(cart);
  TestValidator.equals("Cart buyer_id matches", cart.buyer_id, buyerAuth.id);

  // 3. Generate a random cart item payload
  const cartItemBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    // variant_id can be optionally included
    variant_id:
      Math.random() < 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined,
    // At least quantity 1 (int32)
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    // Non-required options
    options: undefined,
  } satisfies IAiCommerceCartItem.ICreate;

  // 4. Add the cart item using POST /aiCommerce/buyer/carts/{cartId}/items
  const createdItem = await api.functional.aiCommerce.buyer.carts.items.create(
    connection,
    {
      cartId: cart.id,
      body: cartItemBody,
    },
  );
  typia.assert(createdItem);
  TestValidator.equals(
    "Cart item is for the correct cart",
    createdItem.cart_id,
    cart.id,
  );
  TestValidator.equals(
    "Product id is correct",
    createdItem.product_id,
    cartItemBody.product_id,
  );
  TestValidator.equals(
    "Quantity is correct",
    createdItem.quantity,
    cartItemBody.quantity,
  );
  if (cartItemBody.variant_id !== undefined && cartItemBody.variant_id !== null)
    TestValidator.equals(
      "Variant id is correct",
      createdItem.variant_id,
      cartItemBody.variant_id,
    );
  else
    TestValidator.equals(
      "Variant id is null or undefined",
      createdItem.variant_id,
      null,
    );
  // Optionally, options can be checked for undefined/null as well if supported by contract
}

/**
 * - Verified all imports come only from the template.
 * - All required API calls for buyer creation, cart creation, and item creation
 *   are correctly awaited.
 * - DTO usage: Uses exact IBuyer.ICreate for join, IAiCommerceCart.ICreate for
 *   cart, and IAiCommerceCartItem.ICreate for cart item creation. All
 *   properties used match the provided DTOs.
 * - Random data generation uses typia.random with tag types and constraints.
 * - All test validator checks use descriptive titles as first parameter.
 * - For variant_id/options, correct optional property use (optional / undefined,
 *   matches DTO), and variant_id/type matching is validated based on whether it
 *   was sent.
 * - Typia.assert used on all responses for runtime and compile-time type safety.
 * - The business logic is realistic: buyer, cart, and item are sequentially
 *   linked and verified.
 * - No business or type rules are violated.
 * - No extraneous code or deprecated patterns. No code block or markdown
 *   pollution, function is pure TypeScript per template.
 * - No error scenarios (only success covered, matching functionName and scenario
 *   description).
 * - Template untouched except for body and top-level doc.
 * - Follows all checklist and documentation instructions.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O No missing required fields
 *   - O TestValidator titles are descriptive
 *   - O Request/response DTO types are correct
 */
const __revise = {};
__revise;
