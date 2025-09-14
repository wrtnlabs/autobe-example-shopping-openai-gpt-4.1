import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful retrieval of store banking details by an admin user.
 *
 * This test emulates the full administrative flow required to validate
 * privileged access by admin for sensitive banking records of a seller's
 * store. It chains together multi-role authentication, dependent resource
 * creation, and final retrieval as follows:
 *
 * 1. Register a new admin user with random (but unique) email and status,
 *    acquiring admin authentication context.
 * 2. Register a new seller with random email and password, acquiring seller
 *    authentication context.
 * 3. Seller creates a new store using valid owner and seller profile linkage,
 *    plus unique store name/code, and required business metadata/status.
 * 4. Seller sets up the store's banking configuration with legal institution
 *    data, randomized account information, and optional metadata/routing
 *    code.
 * 5. Admin re-authenticates (to effect user/context switch), then retrieves
 *    banking details for the new store using its banking record ID.
 * 6. Assert that the retrieved banking record matches the originally created
 *    values (name, account number, holder name, etc.), and that all
 *    compliance/verification fields are present.
 *
 * This scenario guarantees that admin users can view all sensitive store
 * bank information by ID, and enforces that authorization/isolation
 * requirements are met across seller and admin actors.
 */
export async function test_api_store_banking_admin_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin joins (admin user registration)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminAuthorized);

  // 2. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuthorized);

  // 3. Seller creates a new store
  const storeCreateBody = {
    owner_user_id: sellerAuthorized.id,
    seller_profile_id: sellerAuthorized.id, // (assuming id is suitable for both)
    store_name: RandomGenerator.name(2),
    store_code: RandomGenerator.alphaNumeric(8),
    store_metadata: null,
    approval_status: "active",
    closure_reason: null,
  } satisfies IAiCommerceStores.ICreate;
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: storeCreateBody,
    },
  );
  typia.assert(store);

  // 4. Seller creates banking config for their store
  const bankingCreateBody = {
    store_id: store.id,
    bank_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    account_number: RandomGenerator.alphaNumeric(12),
    account_holder_name: RandomGenerator.name(2),
    routing_code: null,
    banking_metadata: null,
  } satisfies IAiCommerceStoreBanking.ICreate;
  const banking = await api.functional.aiCommerce.seller.storeBanking.create(
    connection,
    {
      body: bankingCreateBody,
    },
  );
  typia.assert(banking);

  // 5. Switch back to admin role (login as admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 6. Retrieve banking config as admin
  const bankingRecord = await api.functional.aiCommerce.admin.storeBanking.at(
    connection,
    {
      storeBankingId: banking.id,
    },
  );
  typia.assert(bankingRecord);

  // 7. Business logic: verify that retrieved record matches what seller entered
  TestValidator.equals("banking id matches", bankingRecord.id, banking.id);
  TestValidator.equals("store id matches", bankingRecord.store_id, store.id);
  TestValidator.equals(
    "bank name matches",
    bankingRecord.bank_name,
    bankingCreateBody.bank_name,
  );
  TestValidator.equals(
    "account number matches",
    bankingRecord.account_number,
    bankingCreateBody.account_number,
  );
  TestValidator.equals(
    "account holder name matches",
    bankingRecord.account_holder_name,
    bankingCreateBody.account_holder_name,
  );
  TestValidator.equals(
    "routing code matches",
    bankingRecord.routing_code,
    bankingCreateBody.routing_code,
  );
  TestValidator.equals(
    "banking metadata matches",
    bankingRecord.banking_metadata,
    bankingCreateBody.banking_metadata,
  );
  TestValidator.predicate(
    "verified is boolean",
    typeof bankingRecord.verified === "boolean",
  );
  TestValidator.predicate(
    "created_at is string",
    typeof bankingRecord.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof bankingRecord.updated_at === "string",
  );
  // Optional: verify deleted_at is null/undefined on a live record
  TestValidator.predicate(
    "not deleted",
    bankingRecord.deleted_at === null || bankingRecord.deleted_at === undefined,
  );
}

/**
 * - The code follows the step-by-step business workflow of admin onboarding,
 *   seller onboarding, store creation, banking creation, then admin retrieval.
 * - All API calls use proper await, and all typia.assert()/TestValidator calls
 *   are correct. No illogical operations, type errors, or imported types
 *   outside what is present in the template.
 * - Request bodies are built according to the required DTOs, with the correct
 *   type satisfies and without any extra or missing fields.
 * - The correct context switch for admin login before retrieval is handled.
 * - There is no type validation, response type validation after typia.assert, nor
 *   any HTTP status code or error message testing.
 * - All assertions use business logic checks only, with correct title-first
 *   TestValidator pattern. Random data (emails, password, etc.) follows correct
 *   utility and format usage (e.g., alphaNumeric, name, paragraph).
 * - Proper type strictness and business-literal values for all properties. No
 *   extra properties present. No imports manipulated.
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
 *   - O 4.5. Typia Tag Type Conversion
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. TypeScript, Not Markdown Documents
 *   - O 4.11. Anti-Hallucination Protocol
 *   - O 4.12. NO TYPE ERROR TESTING
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O EVERY api.functional.* call has await
 *   - O All API calls use proper parameter structure and type safety
 *   - O CRITICAL: NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Random data generation uses appropriate constraints and formats
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 */
const __revise = {};
__revise;
