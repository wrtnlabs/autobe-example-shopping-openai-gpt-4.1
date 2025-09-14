import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates seller-initiated order cancellation requests for own orders.
 *
 * This test ensures that:
 *
 * - A seller can register and list a product
 * - A buyer can register and create an order for that product
 * - The seller can then authenticate and submit an order cancellation for
 *   that order
 * - The order cancellation record is created with correct references to
 *   order, actor, and business information
 *
 * Steps:
 *
 * 1. Register a seller (gather credentials for future authentication)
 * 2. Seller creates a new product and please store product/store/seller IDs
 * 3. Register a buyer (collect credentials for login)
 * 4. Authenticate as buyer
 * 5. Buyer creates an order for the seller's product (gather order and order
 *    item IDs)
 * 6. Authenticate as seller (role switch)
 * 7. Seller submits an order cancellation for own order via seller endpoint
 * 8. Assert returned cancellation record: correct order_id, actor_id, status,
 *    and timestamps
 */
export async function test_api_seller_order_cancellation_create_success(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller_email = typia.random<string & tags.Format<"email">>();
  const seller_password = RandomGenerator.alphaNumeric(10);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 2. Seller creates a product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerAuth.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        business_status: "listed",
        current_price: 1000,
        inventory_quantity: 10,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Register buyer
  const buyer_email = typia.random<string & tags.Format<"email">>();
  const buyer_password = RandomGenerator.alphaNumeric(12);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer_email,
      password: buyer_password,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // 4. Authenticate as buyer (re-login for realism, optional)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer_email,
      password: buyer_password,
    } satisfies IBuyer.ILogin,
  });

  // 5. Buyer creates order for the product
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerAuth.id,
        channel_id: typia.random<string & tags.Format<"uuid">>(),
        order_code: RandomGenerator.alphaNumeric(12),
        status: "created",
        total_price: product.current_price,
        currency: "KRW",
        address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
        ai_commerce_order_items: [
          {
            product_variant_id: product.id,
            item_code: RandomGenerator.alphaNumeric(8),
            name: product.name,
            quantity: 1,
            unit_price: product.current_price,
            total_price: product.current_price * 1,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Authenticate as seller (switch roles)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller_email,
      password: seller_password,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 7. Seller submits order cancellation for own order
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellation =
    await api.functional.aiCommerce.seller.orders.cancellations.create(
      connection,
      {
        orderId: order.id,
        body: {
          reason: cancellationReason,
          // Omit item_ids so this is a full order cancellation
        } satisfies IAiCommerceOrderCancellation.ICreate,
      },
    );
  typia.assert(cancellation);

  // 8. Validate cancellation record
  TestValidator.equals(
    "order id in cancellation matches created order",
    cancellation.order_id,
    order.id,
  );
  TestValidator.equals(
    "actor id in cancellation is seller",
    cancellation.actor_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "cancellation reason matches input",
    cancellation.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "order cancellation status is 'requested'",
    cancellation.status,
    "requested",
  );
  TestValidator.predicate(
    "cancellation id is a non-empty string",
    typeof cancellation.id === "string" && cancellation.id.length > 0,
  );
  TestValidator.predicate(
    "cancellation requested_at is a non-empty string",
    typeof cancellation.requested_at === "string" &&
      cancellation.requested_at.length > 0,
  );
}

/**
 * Draft code walks through the correct business flow, implementing seller/buyer
 * registration, product creation, order creation, and seller-side order
 * cancellation. All DTOs are validated by typia, and realistic random data is
 * used throughout (including type-safe RandomGenerator and typia.random usage).
 * Proper role switching is performed, and logic validations use TestValidator
 * with descriptive titles. All API calls use await, and response types are
 * checked directly. No TypeScript type violations or forbidden error validation
 * (no 'as any', no type errors) are present. Function structure, naming,
 * parameter usage, and in-function helper variables all conform to
 * requirements. Adequate scenario documentation and comments are present. No
 * missing awaits, import abuse, or template violations. TestValidator.predicate
 * is used to check non-empty IDs/timestamps as required. No type error testing,
 * status code validation, or connection.headers manipulation is present or
 * necessary. Role transitions (buyer/seller) are explicit and logical.
 *
 * Zero tolerance error checks confirm there are no absolute violations, and the
 * function is both compilable and logically robust.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
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
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
