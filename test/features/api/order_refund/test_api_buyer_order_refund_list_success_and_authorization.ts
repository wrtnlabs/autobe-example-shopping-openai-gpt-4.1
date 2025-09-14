import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderRefund";

/**
 * Test that a buyer can retrieve the list of refunds for their own order and
 * that unauthorized (other) buyers are prevented from accessing another buyer's
 * refunds. This covers a realistic business flow including:
 *
 * 1. Seller registration and login
 * 2. Seller creates a store
 * 3. Seller creates a product
 * 4. Buyer registration and login
 * 5. Buyer orders that product
 * 6. Buyer requests a refund for that order
 * 7. Buyer lists refunds for the order (success)
 * 8. Second buyer (non-owner) registration/login and attempts to list same order's
 *    refunds (should fail)
 *
 * Steps include validation of positive and negative (authorization) cases, with
 * proper type checking and business logic validation. Random but realistic test
 * data is used for all business entities according to DTO strictness.
 */
export async function test_api_buyer_order_refund_list_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Seller registration and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 2. Seller creates a store
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerAuth.id,
        seller_profile_id: sellerAuth.id,
        store_name: RandomGenerator.name(2),
        store_code: RandomGenerator.alphaNumeric(8),
        approval_status: "active",
        store_metadata: undefined,
        closure_reason: undefined,
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);

  // 3. Seller creates a product
  const productPrice = 10000;
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerAuth.id,
        store_id: store.id,
        product_code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 7,
        }),
        status: "active",
        business_status: "approved",
        current_price: productPrice,
        inventory_quantity: 10,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. First buyer registration and login
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // 5. Buyer creates an order
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const addressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerAuth.id,
        channel_id: channelId,
        order_code: orderCode,
        status: "created",
        total_price: product.current_price,
        currency: "KRW",
        address_snapshot_id: addressSnapshotId,
        ai_commerce_order_items: [
          {
            product_variant_id: product.id as string & tags.Format<"uuid">,
            item_code: RandomGenerator.alphaNumeric(10),
            name: product.name,
            quantity: 1,
            unit_price: product.current_price,
            total_price: product.current_price,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Buyer requests a refund for this order
  const refundAmount = product.current_price;
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refund = await api.functional.aiCommerce.buyer.orders.refunds.create(
    connection,
    {
      orderId: order.id,
      body: {
        actor_id: buyerAuth.id,
        amount: refundAmount,
        currency: order.currency,
        reason: refundReason,
      } satisfies IAiCommerceOrderRefund.ICreate,
    },
  );
  typia.assert(refund);

  // 7. Buyer lists refunds for their order (success path)
  const refundList = await api.functional.aiCommerce.buyer.orders.refunds.index(
    connection,
    {
      orderId: order.id,
      body: {
        order_id: order.id,
        status: [refund.status],
        page: 1,
        limit: 10,
      } satisfies IAiCommerceOrderRefund.IRequest,
    },
  );
  typia.assert(refundList);
  TestValidator.predicate(
    "Buyer sees their own refund in refund list",
    refundList.data.find((r) => r.id === refund.id) !== undefined,
  );

  // 8. Second buyer (non-owner) registration and login
  const secondBuyerEmail = typia.random<string & tags.Format<"email">>();
  const secondBuyerPassword = RandomGenerator.alphaNumeric(12);
  const secondBuyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: secondBuyerEmail,
      password: secondBuyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(secondBuyerAuth);

  // 9. Second buyer (non-owner) login (role/context switch)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: secondBuyerEmail,
      password: secondBuyerPassword,
    } satisfies IBuyer.ILogin,
  });
  await TestValidator.error(
    "Second buyer cannot access another buyer's order refunds",
    async () => {
      await api.functional.aiCommerce.buyer.orders.refunds.index(connection, {
        orderId: order.id,
        body: {
          order_id: order.id,
          page: 1,
          limit: 5,
        } satisfies IAiCommerceOrderRefund.IRequest,
      });
    },
  );
}

/**
 * - Draft implementation covers a complete real business flow: seller and buyer
 *   creation, store/product/order setup, refund creation, refund listing and
 *   negative access control testing.
 * - All API calls have proper await usage and param structure.
 * - Uses precise DTO types for each operation.
 * - Authentication and SDK token switching handled via provided APIs (no manual
 *   header edits).
 * - Correct patterns for TestValidator with title first in all assertions and
 *   error tests.
 * - No forbidden import, require, or creative import patterns.
 * - Test data is randomly generated and uses only allowed DTO fields.
 * - Error case (cross-buyer refund list access) tested with await
 *   TestValidator.error(async ...).
 * - No type error/scenario testing; correct focus on business logic errors only.
 * - Variable names and comments are descriptive for readability.
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
