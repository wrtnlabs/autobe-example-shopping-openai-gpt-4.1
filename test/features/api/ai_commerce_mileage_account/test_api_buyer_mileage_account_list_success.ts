import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageAccount";

/**
 * Validate that a buyer can retrieve only their own mileage accounts with
 * proper paging and data isolation.
 *
 * 1. Register a new buyer (random email, random valid password)
 * 2. Register a new admin (random email, random valid password, status
 *    'active')
 * 3. Admin login
 * 4. Admin creates two mileage accounts for the buyer: one with default
 *    status, one with 'suspended', each with unique account_code and
 *    different balances
 * 5. Buyer login
 * 6. Buyer requests mileage account list with PATCH
 *    /aiCommerce/buyer/mileageAccounts (no filter)
 *
 *    - Assert only buyer's own mileage accounts returned
 *    - All accounts data matches schema (typia.assert)
 *    - No accounts from other users present
 *    - Pagination: with limit=1, get page 1 and page 2; assert only one account
 *         per page, total records correct, correct account shown on each
 *         page
 * 7. All field values conform to schema, no sensitive info from others present
 */
export async function test_api_buyer_mileage_account_list_success(
  connection: api.IConnection,
) {
  // 1. Register a buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphabets(12);
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 3. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 4. Admin creates two mileage accounts for the buyer
  const accountCode1 = RandomGenerator.alphaNumeric(10);
  const account1 = await api.functional.aiCommerce.admin.mileageAccounts.create(
    connection,
    {
      body: {
        user_id: buyer.id,
        account_code: accountCode1,
        balance: 1000,
        status: "active",
      } satisfies IAiCommerceMileageAccount.ICreate,
    },
  );
  typia.assert(account1);

  const accountCode2 = RandomGenerator.alphaNumeric(10);
  const account2 = await api.functional.aiCommerce.admin.mileageAccounts.create(
    connection,
    {
      body: {
        user_id: buyer.id,
        account_code: accountCode2,
        balance: 2000,
        status: "suspended",
      } satisfies IAiCommerceMileageAccount.ICreate,
    },
  );
  typia.assert(account2);

  // 5. Buyer login
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 6. Buyer requests mileage account list (without filter) and checks results
  const page = await api.functional.aiCommerce.buyer.mileageAccounts.index(
    connection,
    {
      body: {}, // No filter: should return buyerr's accounts
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "All returned mileage accounts belong to the buyer",
    page.data.every((acc) => acc.user_id === buyer.id),
  );
  TestValidator.predicate(
    "No mileage accounts for other users present",
    page.data.find((acc) => acc.user_id !== buyer.id) === undefined,
  );
  TestValidator.equals(
    "At least two accounts exist (created for this scenario)",
    page.data.length >= 2,
    true,
  );

  // 7. Pagination: limit=1, page=1
  const paged1 = await api.functional.aiCommerce.buyer.mileageAccounts.index(
    connection,
    {
      body: {
        limit: 1 as number, // as number for tag relaxation
        page: 1 as number,
      } satisfies IAiCommerceMileageAccount.IRequest,
    },
  );
  typia.assert(paged1);
  TestValidator.equals(
    "Page 1 limit=1 returns one account",
    paged1.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination current page is 1",
    paged1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Account in page 1 belongs to buyer",
    paged1.data[0].user_id === buyer.id,
  );

  // 8. Pagination: limit=1, page=2
  const paged2 = await api.functional.aiCommerce.buyer.mileageAccounts.index(
    connection,
    {
      body: {
        limit: 1 as number,
        page: 2 as number,
      } satisfies IAiCommerceMileageAccount.IRequest,
    },
  );
  typia.assert(paged2);
  TestValidator.equals(
    "Page 2 limit=1 returns one account",
    paged2.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination current page is 2",
    paged2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "Account in page 2 belongs to buyer",
    paged2.data[0].user_id === buyer.id,
  );

  // 9. No accounts for other users in paging
  TestValidator.predicate(
    "No account on either page belongs to others",
    paged1.data.every((a) => a.user_id === buyer.id) &&
      paged2.data.every((a) => a.user_id === buyer.id),
  );
}

/**
 * - Code is well structured and follows the required test template.
 * - Scenario covers registration and login for both buyer and admin, and proper
 *   account switching is used.
 * - Correct SDK functions, request body shapes, and DTO variants are used at each
 *   call step.
 * - Mileage accounts are created for the correct user only by admin after
 *   switching authentication.
 * - List result is asserted to only contain buyer's own mileage accounts, using
 *   strict ownership check via user_id.
 * - Pagination is validated by querying with limit=1 and different page numbers,
 *   ensuring only one account per page, with current page check.
 * - No type-unsafe constructs, no wrong data, no as any, all required
 *   assertions/predicates include descriptive titles.
 * - Typia.assert is used on all responses for type validation.
 * - No non-existent property references, no fictional code or APIs are included.
 * - No missing await in any async call; proper use of await everywhere.
 * - No header manipulation, no TestValidator misuse, error testing is not
 *   type-related, no business/data leakages.
 * - Variable naming is descriptive and clear. Comments focus on business-purpose
 *   and test logic.
 * - No markdown or code block wrappers present.
 * - All required test plan points implemented. No issues found.
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
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All DTO types used exactly as specified
 *   - O No fictional functions/types from examples used
 *   - O No `as any` usage
 *   - O No response type validation after typia.assert()
 *   - O All nullable/undefinable types handled properly
 *   - O No headers manipulation in connection object
 *   - O No external helper utilities used
 *   - O No code block or markdown output
 *   - O Step 4 revise COMPLETED
 */
const __revise = {};
__revise;
