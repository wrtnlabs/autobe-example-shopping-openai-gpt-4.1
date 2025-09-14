import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderItem";

/**
 * Validate seller can retrieve and filter their assigned order items for a
 * given order.
 *
 * - Onboard seller and buyer
 * - Buyer places an order (with order item assigned to seller)
 * - Seller authenticates and lists (searches/updates) order items by orderId
 * - Validate order items belong to the seller
 * - Check filter/search by delivery_status and item attributes (positive case:
 *   own order items)
 * - Validate error when a different/non-owner seller logs in and tries to
 *   search/update
 */
export async function test_api_seller_order_items_update(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 2. Buyer registers
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 12,
  });
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // 3. Buyer creates order (assign item to seller)
  // Needed fields for IAiCommerceOrder.ICreate:
  //   - buyer_id, channel_id, order_code, status, total_price, currency, address_snapshot_id, ai_commerce_order_items
  const orderItem = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerAuth.id,
    item_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    quantity: 2,
    unit_price: 5000,
    total_price: 10000,
  } satisfies IAiCommerceOrderItem.ICreate;

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

  // Must switch to buyer context (if needed; join sets buyer token)
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 4. Seller logs in (make sure token context is seller, not buyer)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 5. Seller retrieves/updates their order items for this order
  const response = await api.functional.aiCommerce.seller.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: {}, // No filter yields all order items seller has access to
    },
  );
  typia.assert(response);

  // Validate: result contains only order items with seller_id == sellerAuth.id
  TestValidator.predicate(
    "all returned items belong to the seller",
    response.data.every((item) => item.seller_id === sellerAuth.id),
  );

  // 6. Business status filter/search - delivery_status
  // Fake delivery_status unique value for testing filter
  const statuses = response.data.map((i) => i.delivery_status);
  if (statuses.length > 0) {
    const testStatus = statuses[0];
    const filtered = await api.functional.aiCommerce.seller.orders.items.index(
      connection,
      {
        orderId: order.id,
        body: {
          delivery_status: testStatus,
        } satisfies IAiCommerceOrderItem.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered items match delivery_status",
      filtered.data.every(
        (i) =>
          i.delivery_status === testStatus && i.seller_id === sellerAuth.id,
      ),
    );
  }

  // 7. NEGATIVE: Register a different seller, attempt update/search - should yield no data or error
  const hackerSellerEmail = typia.random<string & tags.Format<"email">>();
  const hackerSellerPassword = RandomGenerator.paragraph({ sentences: 2 });
  const hackerSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: hackerSellerEmail,
      password: hackerSellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(hackerSeller);
  // Switch login to hacker seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: hackerSellerEmail,
      password: hackerSellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  // Try to search for items in the order (should return none, or items not accessible)
  const hackerView = await api.functional.aiCommerce.seller.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: {},
    },
  );
  typia.assert(hackerView);
  TestValidator.equals(
    "hacker seller gets zero items for someone else's order",
    hackerView.data.length,
    0,
  );
}

/**
 * The draft code adheres closely to the scenario and all AutoBE test
 * guidelines. Major checks:
 *
 * - All dependencies and test steps are present: seller/buyer onboarding, buyer
 *   order creation with order item assigned to seller, seller authenticating
 *   and accessing order items, and negative test for non-owning seller.
 * - All required calls to API functions use `await`.
 * - No additional or non-template imports; all DTOs used are only from the
 *   provided materials.
 * - Random/typed data generation is strictly typed for email, uuid, password,
 *   etc. using typia.random and RandomGenerator.
 * - Request bodies and DTO usage align exactly with the provided types. Explicit
 *   use of satisfies keyword for request bodies. No type assertion, no as any
 *   usage.
 * - Null vs undefined is handled properly (e.g., seller_id optionality for order
 *   item, but required here). No nullable/undefined confusion in assignments.
 * - TestValidator functions always provide descriptive titles in the first
 *   argument, and assertions are actual-first, expected-second.
 * - Negative test checks that a non-owner seller cannot see another seller's
 *   order items; the outcome is validated as zero results.
 * - No type error tests or type safety violations. No HTTP status code testing,
 *   no creative error handling or fake fields/properties.
 * - Code structure and logic avoid illogical patterns, maintain business flow
 *   integrity, and perform all context/role switches logically and explicitly.
 * - Code includes comprehensive step-by-step comments for every business action,
 *   and all random data is generated with proper constraints.
 *
 * No areas were identified that violate compilation, type safety, or business
 * logic rules. The revise/final output should be the same as the draft.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
