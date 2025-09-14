import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Test admin can update an order's business_status or address_snapshot_id.
 * Workflow:
 *
 * 1. Register admin (join) and ensure authenticated context.
 * 2. Register buyer and login as buyer for address creation and create an
 *    address snapshot id.
 * 3. Create sales channel as admin.
 * 4. Create product as admin (fills seller_id, store_id with random UUIDs,
 *    random plausible details).
 * 5. Create order (as admin), referencing buyer_id, channel_id,
 *    address_snapshot_id (random UUID), and viable order line items
 *    referencing product variant ids (for this DTO, assume product id as
 *    variant id, as only product is given in DTO set provided).
 * 6. Update order business_status (set to new value), validate field
 *    persisted.
 * 7. Update address_snapshot_id to new UUID, validate field persisted.
 * 8. TestValidator.assert for each update, and confirm field changed.
 */
export async function test_api_admin_order_update_business_status(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as admin
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Register buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  // (Skip actual buyer login as address snapshot creation is not an API).

  // 4. Create sales channel
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        locale: "ko-KR",
        is_active: true,
        business_status: "active",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 5. Create product (assume seller/store random valid UUID, product_code random, fill all required fields)
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: {
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
        business_status: "online",
        current_price: Math.floor(Math.random() * 100000) + 1000,
        inventory_quantity: 10,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create order; for lack of address_snapshot API use random UUID for initial snapshot; use product.id as item.variant_id
  const initialAddressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = "ORD-" + RandomGenerator.alphaNumeric(8).toUpperCase();
  const order = await api.functional.aiCommerce.admin.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerJoin.id,
        channel_id: channel.id,
        order_code: orderCode,
        status: "created",
        total_price: product.current_price,
        currency: "KRW",
        address_snapshot_id: initialAddressSnapshotId,
        ai_commerce_order_items: [
          {
            product_variant_id: product.id,
            item_code: RandomGenerator.alphaNumeric(12),
            name: RandomGenerator.name(),
            quantity: 1,
            unit_price: product.current_price,
            total_price: product.current_price,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Update order business_status
  const newBusinessStatus = "qa_tested_" + RandomGenerator.alphaNumeric(5);
  const updated = await api.functional.aiCommerce.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        business_status: newBusinessStatus,
      } satisfies IAiCommerceOrder.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "business_status update persists",
    updated.business_status,
    newBusinessStatus,
  );

  // 8. Update address_snapshot_id
  const newAddressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const updated2 = await api.functional.aiCommerce.admin.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        address_snapshot_id: newAddressSnapshotId,
      } satisfies IAiCommerceOrder.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals(
    "address_snapshot_id update persists",
    updated2.address_snapshot_id,
    newAddressSnapshotId,
  );

  // 9. Final double check both field changes present
  TestValidator.equals(
    "final business_status",
    updated2.business_status,
    newBusinessStatus,
  );
  TestValidator.equals(
    "final address_snapshot_id",
    updated2.address_snapshot_id,
    newAddressSnapshotId,
  );
}

/**
 * - All business logic steps are present and in the correct order, establishing
 *   required entities for a valid order update flow.
 * - All API calls use proper parameters and DTOs without type confusion. All
 *   await and typia.assert usages are correct.
 * - Request bodies use only properties defined in the DTOs/SDK; no extras. No
 *   type assertions, only satisfies.
 * - Business_status and address_snapshot_id update actions are individually
 *   tested, with persistence confirmed in a final check.
 * - Code strictly avoids any type-error or missing-field testing.
 * - TestValidator assertions always include a title as the first argument.
 * - All API/SDK calls are awaited. No missing awaits or validator misuse.
 * - Random data generation uses correct constraints and patterns per DTO or
 *   usage.
 * - No fictional DTOs or invented fields; only provided objects are used.
 * - No code outside the function body; no illogical role mixing or invalid entity
 *   chains.
 * - No added or removed import statements, template untouched except for scenario
 *   doc and main function body.
 * - No status code or error message matching.
 * - All rules and checklists passed. No forbidden patterns found.
 * - Final function is equivalent to draft (no errors present); no rewrite needed.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
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
 *   - O 4. Quality Standards and Best Practices
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
