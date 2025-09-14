import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test: Successful deletion of a payment fraud event by an admin.
 *
 * Steps:
 *
 * 1. Register a new admin user with random email/password and status 'active'.
 * 2. Use the join output to continue as an authenticated admin (no logout
 *    necessary).
 * 3. Create a new payment fraud event with unique values via the
 *    paymentFraudEvents.create endpoint.
 * 4. Delete the created payment fraud event using its returned id via
 *    paymentFraudEvents.erase.
 * 5. Assert no error is thrown and void is returned on success.
 * 6. Try to delete the same event again – expect an error (optionally check
 *    with TestValidator.error).
 */
export async function test_api_admin_payment_fraud_event_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminStatus = "active";
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create a payment fraud event
  const fraudEventInput = {
    event_code: RandomGenerator.alphaNumeric(8),
    entity_type: RandomGenerator.pick([
      "payment",
      "coupon",
      "deposit",
      "mileage",
      "transaction",
    ] as const),
    entity_id: typia.random<string>(),
    status: RandomGenerator.pick([
      "detected",
      "under_review",
      "confirmed",
      "dismissed",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    detected_at: new Date().toISOString(),
  } satisfies IAiCommercePaymentFraudEvent.ICreate;

  const fraudEvent =
    await api.functional.aiCommerce.admin.paymentFraudEvents.create(
      connection,
      { body: fraudEventInput },
    );
  typia.assert(fraudEvent);
  TestValidator.equals(
    "fraud event entity_type matches input",
    fraudEvent.entity_type,
    fraudEventInput.entity_type,
  );

  // 3. Delete the payment fraud event (should return void)
  const deleteResult =
    await api.functional.aiCommerce.admin.paymentFraudEvents.erase(connection, {
      paymentFraudEventId: typia.assert<string & tags.Format<"uuid">>(
        fraudEvent.id,
      ),
    });
  TestValidator.equals(
    "erase should return void on success",
    deleteResult,
    undefined,
  );

  // 4. Try to delete again and expect an error
  await TestValidator.error(
    "deleting the same fraud event again should fail",
    async () => {
      await api.functional.aiCommerce.admin.paymentFraudEvents.erase(
        connection,
        {
          paymentFraudEventId: typia.assert<string & tags.Format<"uuid">>(
            fraudEvent.id,
          ),
        },
      );
    },
  );
}

/**
 * The draft test function fully addresses each business and implementation step
 * described in the scenario: an admin is created, a payment fraud event is
 * registered, and the fraud event is then deleted using its ID, verifying
 * success and error on second deletion. Proper DTO variants are used everywhere
 * (IAiCommerceAdmin.IJoin, IAiCommercePaymentFraudEvent.ICreate). All await
 * usage is correct. Random data generation uses tags and utility functions as
 * required. TestValidator functions are used with clear title parameters, and
 * assertions are actual-first. All typia.assert usage and pattern compliance
 * match best practices. No type errors, extra import statements, or illogical
 * code patterns are present. Final code avoids any forbidden type error testing
 * or DTO hallucination. All checklist items and compliance rules from
 * TEST_WRITE.md are satisfied.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. Test Function Structure
 *   - O 3.3. API SDK Function Invocation
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
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
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
 *   - O All API calls use proper parameter structure and type safety
 *   - O DTO type precision (ICreate for POST, base for GET, etc)
 *   - O No DTO type confusion
 *   - O All API responses validated with typia.assert()
 *   - O Authentication handled via API, not connection.headers
 *   - O Only actual authentication APIs used
 *   - O TestValidator functions use descriptive title as FIRST parameter
 *   - O TestValidator assertions use actual-first, expected-second pattern
 *   - O Random data generation uses appropriate constraints
 *   - O All TestValidator functions include title as first parameter
 *   - O Proper null/undefined handling in all code
 */
const __revise = {};
__revise;
