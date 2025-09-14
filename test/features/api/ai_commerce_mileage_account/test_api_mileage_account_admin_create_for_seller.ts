import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that admins can provision a mileage account for a seller user.
 *
 * Business flow:
 *
 * 1. Register a new admin via /auth/admin/join, verifying admin context.
 * 2. Register a new seller via /auth/seller/join and obtain seller's user_id.
 * 3. As admin, call /aiCommerce/admin/mileageAccounts to create a mileage
 *    account for the seller, using their user_id, a generated account_code,
 *    initial balance, and status.
 * 4. Assert that the returned mileage account entity is linked to the correct
 *    seller and schema fields such as account_code, user_id, balance,
 *    status, created_at/updated_at are valid and initialized
 *    appropriately.
 * 5. Ensure all responses conform to the corresponding DTOs.
 */
export async function test_api_mileage_account_admin_create_for_seller(
  connection: api.IConnection,
) {
  // 1. Register a new admin and log in for admin context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = {
    email: adminEmail,
    password: adminPassword,
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);
  // 2. Register a new seller and capture their id
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IAiCommerceSeller.IJoin;
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);
  // 3. As admin, create a mileage account for the seller
  const accountCode = RandomGenerator.alphaNumeric(16);
  const initialBalance = 5000;
  const accountStatus = "active";
  const mileageAccountReq = {
    user_id: seller.id,
    account_code: accountCode,
    balance: initialBalance,
    status: accountStatus,
  } satisfies IAiCommerceMileageAccount.ICreate;
  const mileageAccount =
    await api.functional.aiCommerce.admin.mileageAccounts.create(connection, {
      body: mileageAccountReq,
    });
  typia.assert(mileageAccount);
  // 4. Validate the linkage and schema fields
  TestValidator.equals(
    "mileage account is linked to correct seller user_id",
    mileageAccount.user_id,
    seller.id,
  );
  TestValidator.equals(
    "mileage account_code matches input",
    mileageAccount.account_code,
    accountCode,
  );
  TestValidator.equals(
    "initial balance set",
    mileageAccount.balance,
    initialBalance,
  );
  TestValidator.equals(
    "account status set",
    mileageAccount.status,
    accountStatus,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof mileageAccount.created_at === "string" &&
      !isNaN(Date.parse(mileageAccount.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof mileageAccount.updated_at === "string" &&
      !isNaN(Date.parse(mileageAccount.updated_at)),
  );
  TestValidator.equals(
    "mileage account not soft deleted",
    mileageAccount.deleted_at,
    null,
  );
}

/**
 * All steps are properly covered:
 *
 * - Each step uses only the allowed imports; no import modifications are present.
 * - All required API SDK calls are made with correct DTOs, using `satisfies` for
 *   request bodies.
 * - All randomly generated data is type-safe and uses the correct format and
 *   constraints.
 * - TestValidator assertions include descriptive titles as the first parameter
 *   and proper parameter order.
 * - The function follows business logic exactly, checks linking of seller id,
 *   validates initialization and schema fields, checks date-time iso format
 *   using simple string/date parsing, and verifies soft deletion is null.
 * - All calls to async functions use `await`; no bare promises or missed awaits.
 * - Nullable/undefined handling for deleted_at is checked explicitly.
 * - No type validation or error scenarios that deliberately violate type safety
 *   are present; all business scenarios are runtime-logical.
 * - The function block and comment strictly follow the provided template.
 *
 * There are no violations of any checklist or fantasy property usage. This code
 * fully follows e2e test function rules. No prohibited anti-patterns found;
 * code is fully compilable.
 *
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O Step 4 revise COMPLETED
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O TestValidator functions include descriptive title as FIRST parameter
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 */
const __revise = {};
__revise;
