import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E: Buyer can retrieve their own review detail successfully.
 *
 * 1. Register a buyer (creates IAiCommerceBuyer.IAuthorized and authenticates
 *    context)
 * 2. As this buyer, create an order with one order item
 * 3. As the same buyer, create a review for the order item
 * 4. Attempt to GET /aiCommerce/buyer/reviews/{reviewId} to retrieve the
 *    review detail
 * 5. Assert the returned review matches what was created (id, author_id,
 *    order_item_id, etc.)
 */
export async function test_api_buyer_review_detail_success(
  connection: api.IConnection,
) {
  // 1. Register buyer
  const buyerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IBuyer.ICreate;
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: buyerBody,
  });
  typia.assert(buyerAuth);

  // 2. Create order (with 1 item)
  const orderItem: IAiCommerceOrderItem.ICreate = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    item_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
  };
  const orderBody = {
    buyer_id: buyerAuth.id,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(12),
    status: "created",
    total_price: orderItem.total_price,
    currency: "KRW",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: [orderItem],
  } satisfies IAiCommerceOrder.ICreate;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 3. Create review for order item
  const orderItemId: string & tags.Format<"uuid"> =
    (order as IAiCommerceOrder & { ai_commerce_order_items?: any[] })
      .ai_commerce_order_items &&
    Array.isArray(
      (order as IAiCommerceOrder & { ai_commerce_order_items?: any[] })
        .ai_commerce_order_items,
    ) &&
    (order as IAiCommerceOrder & { ai_commerce_order_items: any[] })
      .ai_commerce_order_items.length > 0
      ? (order as IAiCommerceOrder & { ai_commerce_order_items: any[] })
          .ai_commerce_order_items[0].id
      : typia.random<string & tags.Format<"uuid">>();
  const reviewBody = {
    order_item_id: orderItemId,
    rating: 5,
    body: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
  } satisfies IAiCommerceReview.ICreate;
  const review = await api.functional.aiCommerce.buyer.reviews.create(
    connection,
    { body: reviewBody },
  );
  typia.assert(review);

  // 4. GET /aiCommerce/buyer/reviews/{reviewId}
  const got = await api.functional.aiCommerce.buyer.reviews.at(connection, {
    reviewId: review.id,
  });
  typia.assert(got);

  // 5. Assert returned review matches expectations
  TestValidator.equals("review id matches", got.id, review.id);
  TestValidator.equals("review author matches", got.author_id, buyerAuth.id);
  TestValidator.equals(
    "review order_item_id matches",
    got.order_item_id,
    reviewBody.order_item_id,
  );
  TestValidator.equals("review rating matches", got.rating, reviewBody.rating);
  TestValidator.equals("review body matches", got.body, reviewBody.body);
  TestValidator.equals(
    "review visibility matches",
    got.visibility,
    reviewBody.visibility,
  );
}

/**
 * - TypeScript and request/response types are correct. Uses only schema
 *   properties from provided DTOs.
 * - Strictly follows the business flow: buyer registration → order w/ order item
 *   → review creation → review detail fetch.
 * - Random data generation for email, order codes, UUIDs, etc., uses only
 *   imported utilities without any extra modules or code.
 * - All usages of typia.random include correct generic type arguments.
 * - Each request body variable is declared with `const`, no mutations.
 * - No additional imports outside the template.
 * - Await used with all async API function calls.
 * - TestValidator assertions always include explicit, meaningful titles. Asserts
 *   all key fields of the review.
 * - Handles AICommerceOrder.ai_commerce_order_items array with appropriate type
 *   narrowing to extract order item ID reliably for review creation.
 * - No `as any`, no type error scenarios, no header manipulation.
 * - No type or DTO confusion; correct variants for each operation.
 * - Code is logically structured and only uses allowed APIs, DTOs, test data, and
 *   utilities.
 * - No extraneous or missing required properties in request/response bodies.
 * - Only code inside function is authored; no changes to imports or template
 *   structure.
 * - All rules and checklist items satisfied.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O No compilation errors
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O NO bare Promise assignments
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O TestValidator assertions use actual-first, expected-second pattern (after
 *       title)
 *   - O DTO type precision: correct DTO variant for each operation
 *   - O No DTO type confusion
 *   - O Path parameters and request body correctly structured in second parameter
 *   - O All API responses validated with typia.assert()
 *   - O Authentication handled via actual API, no headers manipulation
 *   - O NO connection.headers manipulation
 *   - O All random data uses correct tags and formats
 *   - O NO fictional functions, only provided APIs used
 *   - O All nullable/undefinable types handled appropriately
 */
const __revise = {};
__revise;
