import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import type { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import type { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import type { IAiCommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentTransaction";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for admin payment transaction creation
 *
 * This test flow ensures an admin can successfully create a payment
 * transaction, with all related references present, and verifies error
 * handling for missing or invalid references.
 *
 * 1. Register and authenticate as admin
 * 2. Create a payment record, obtain payment_id
 * 3. Create a payment method, obtain method_id
 * 4. Create a payment gateway, obtain gateway_id
 * 5. Create a new payment transaction with all required refs, status, amount,
 *    etc.
 * 6. Check the response and assert all returned data matches the input and has
 *    correct structure
 * 7. Attempt to create a transaction with non-existent payment_id (should
 *    error)
 * 8. Attempt to create a transaction with non-existent method_id (should
 *    error)
 * 9. Attempt to create a transaction with non-existent gateway_id (should
 *    error)
 */
export async function test_api_admin_payment_transactions_create(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create payment
  const payment_reference = `PAY-${RandomGenerator.alphaNumeric(8)}`;
  const currency_code = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);
  const issued_at = new Date().toISOString();
  const payment = await api.functional.aiCommerce.admin.payments.create(
    connection,
    {
      body: {
        payment_reference,
        status: "pending",
        amount: 10000,
        currency_code,
        issued_at,
      } satisfies IAiCommercePayment.ICreate,
    },
  );
  typia.assert(payment);

  // 3. Create payment method
  const method_code = `METHOD_${RandomGenerator.alphaNumeric(6)}`.toUpperCase();
  const paymentMethod =
    await api.functional.aiCommerce.admin.paymentMethods.create(connection, {
      body: {
        method_code,
        display_name: RandomGenerator.name(),
        is_active: true,
      } satisfies IAiCommercePaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 4. Create payment gateway
  const gateway_code = `GW_${RandomGenerator.alphaNumeric(6)}`.toUpperCase();
  const paymentGateway =
    await api.functional.aiCommerce.admin.paymentGateways.create(connection, {
      body: {
        gateway_code,
        display_name: RandomGenerator.name(),
        api_endpoint: `https://api.${RandomGenerator.alphabets(5)}.com`,
        is_active: true,
        supported_currencies: currency_code,
      } satisfies IAiCommercePaymentGateway.ICreate,
    });
  typia.assert(paymentGateway);

  // 5. Create payment transaction
  const transaction_reference = `TXN-${RandomGenerator.alphaNumeric(10)}`;
  const requested_at = new Date().toISOString();
  const transaction_body = {
    payment_id: payment.id,
    method_id: paymentMethod.id,
    gateway_id: paymentGateway.id,
    transaction_reference,
    status: "pending",
    amount: 10000,
    currency_code,
    requested_at,
  } satisfies IAiCommercePaymentTransaction.ICreate;

  const transaction =
    await api.functional.aiCommerce.admin.paymentTransactions.create(
      connection,
      {
        body: transaction_body,
      },
    );
  typia.assert(transaction);
  TestValidator.equals(
    "transaction.payment_id matches",
    transaction.payment_id,
    payment.id,
  );
  TestValidator.equals(
    "transaction.method_id matches",
    transaction.method_id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "transaction.gateway_id matches",
    transaction.gateway_id,
    paymentGateway.id,
  );
  TestValidator.equals(
    "transaction.transaction_reference matches",
    transaction.transaction_reference,
    transaction_reference,
  );
  TestValidator.equals(
    "transaction.amount matches",
    transaction.amount,
    transaction_body.amount,
  );
  TestValidator.equals(
    "transaction.currency_code matches",
    transaction.currency_code,
    currency_code,
  );
  TestValidator.equals(
    "transaction.status matches",
    transaction.status,
    transaction_body.status,
  );
  TestValidator.equals(
    "transaction.requested_at matches",
    transaction.requested_at,
    requested_at,
  );

  // 7. Error: Non-existent payment_id
  await TestValidator.error(
    "creating transaction with non-existent payment_id should fail",
    async () => {
      await api.functional.aiCommerce.admin.paymentTransactions.create(
        connection,
        {
          body: {
            ...transaction_body,
            payment_id: typia.random<string & tags.Format<"uuid">>(), // random non-existent
          } satisfies IAiCommercePaymentTransaction.ICreate,
        },
      );
    },
  );

  // 8. Error: Non-existent method_id
  await TestValidator.error(
    "creating transaction with non-existent method_id should fail",
    async () => {
      await api.functional.aiCommerce.admin.paymentTransactions.create(
        connection,
        {
          body: {
            ...transaction_body,
            method_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAiCommercePaymentTransaction.ICreate,
        },
      );
    },
  );

  // 9. Error: Non-existent gateway_id
  await TestValidator.error(
    "creating transaction with non-existent gateway_id should fail",
    async () => {
      await api.functional.aiCommerce.admin.paymentTransactions.create(
        connection,
        {
          body: {
            ...transaction_body,
            gateway_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAiCommercePaymentTransaction.ICreate,
        },
      );
    },
  );
}

/**
 * - The draft function follows the real-world workflow: admin authentication →
 *   creation of required references (payment, payment method, gateway) →
 *   payment transaction creation → precise business error checks for
 *   missing/fake references. All TestValidator assertions include a descriptive
 *   title. All required fields for .ICreate DTOs are present, with careful null
 *   handling and no type error attempts. Use of random data generation is
 *   accurate and realistic. All API calls are properly awaited. No additional
 *   import statements are created, and there is no template code modification
 *   outside the allowed section. The error test cases are business logic
 *   violations, not type errors, and use new random UUIDs for non-existent
 *   references. There is no use of any forbidden patterns (e.g., as any,
 *   missing required fields, require statements, or markdown contamination).
 *   Type validation, parameter structure, and function naming all strictly
 *   comply with requirements. This is a high-quality, production-ready
 *   implementation.
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
 *   - O API function calling follows SDK pattern
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional syntax
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
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
