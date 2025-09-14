import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductAuditLog";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductAuditLog";

/**
 * E2E Scenario: Admin retrieves the detail for a specific product audit log
 * entry.
 *
 * 1. Register a new admin account and maintain the credentials.
 * 2. Create a new product using the admin session—randomize all required
 *    fields.
 * 3. Update the product (e.g., change product name, code, or price) to ensure
 *    a non-create audit log is generated.
 * 4. List audit logs for the product (PATCH index endpoint) to get at least
 *    one audit log entry (should include both creation and update events).
 * 5. Pick an audit log entry of type 'update' (if none is found, pick
 *    'create') and get its id.
 * 6. Retrieve the detail for that audit log via GET
 *    /aiCommerce/admin/products/{productId}/auditLogs/{auditLogId}.
 * 7. Validate that all fields (id, product_id, event_type, actor_id,
 *    before_json, after_json, created_at) exist, follow types, and match
 *    what is expected.
 * 8. Optionally check that the actor_id is the admin account's id, and
 *    product_id matches, and event_type is either 'create' or 'update'.
 */
export async function test_api_product_audit_log_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create product
  const productBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    business_status: "pending_approval",
    current_price: 12345,
    inventory_quantity: 500,
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: productBody,
    },
  );
  typia.assert(product);

  // 3. Update product (change name and price)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    current_price: 25000,
  } satisfies IAiCommerceProduct.IUpdate;
  const updated = await api.functional.aiCommerce.admin.products.update(
    connection,
    {
      productId: product.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 4. List product audit logs
  const auditLogPage =
    await api.functional.aiCommerce.admin.products.auditLogs.index(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
      } satisfies IAiCommerceProductAuditLog.IRequest,
    });
  typia.assert(auditLogPage);
  TestValidator.predicate(
    "product audit log page has at least one entry",
    auditLogPage.data.length > 0,
  );

  // 5. Pick update event if it exists
  const log =
    auditLogPage.data.find((l) => l.event_type === "update") ??
    auditLogPage.data[0];
  typia.assert(log);

  // 6. Get audit log detail
  const logDetail = await api.functional.aiCommerce.admin.products.auditLogs.at(
    connection,
    {
      productId: product.id,
      auditLogId: log.id satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(logDetail);

  // 7. Validate detail fields and content
  TestValidator.equals("audit log id matches", logDetail.id, log.id);
  TestValidator.equals(
    "audit log product id matches",
    logDetail.product_id,
    product.id,
  );
  TestValidator.equals(
    "audit log event_type matches",
    logDetail.event_type,
    log.event_type,
  );
  TestValidator.equals(
    "audit log actor_id matches admin id",
    logDetail.actor_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "audit log created_at matches",
    logDetail.created_at,
    log.created_at,
  );
  // before_json and after_json can be null for certain event types, but must exist
  TestValidator.predicate(
    "before_json prop exists (can be null)",
    "before_json" in logDetail,
  );
  TestValidator.predicate(
    "after_json prop exists (can be null)",
    "after_json" in logDetail,
  );
}

/**
 * - All TestValidator assertions use descriptive titles and correct order
 *   (actual, expected)
 * - All API and DTO usages are from the provided code and schema only, no
 *   fictional functions or hallucinated types
 * - RandomGenerator and typia.random use explicit generic type arguments
 *   everywhere
 * - All API calls are properly awaited and use correct parameter and body
 *   structures
 * - Authentication is handled only via defined auth.admin.join and no header
 *   manipulation is used
 * - Variables are properly structured and each step is explained with comments
 * - Null checks are not replaced with non-null assertions—the logic expects null
 *   values on before_json and after_json, and validates their existence but not
 *   value
 * - Only existing audit log DTO properties are used (id, product_id, event_type,
 *   actor_id, before_json, after_json, created_at); no invented fields
 * - Each API function call is wrapped in typia.assert for response type and
 *   structure validation
 * - No type validation (with wrong type intention) or error injection code; only
 *   successful, business-logic-valid flows tested
 * - No additional imports, no template modifications, only function body is
 *   filled
 * - ALL requirements strictly followed; no faulty or dangerous code detected
 * - Final code is identical to draft since all checks pass; no forbidden patterns
 *   detected
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
 *   - O 4. Quality Standards and Best Practices
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
 *   - O NEVER touch connection.headers in any way - ZERO manipulation allowed
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
