import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentMethod";

/**
 * Validate admin payment method listing with filtering and pagination.
 *
 * 1. Register a new admin account with a unique email/password
 *    (IAiCommerceAdmin.IJoin)
 * 2. Login as that admin (IAiCommerceAdmin.ILogin)
 * 3. Create three payment methods (IAiCommercePaymentMethod.ICreate) with
 *    unique method_code and distinct is_active values
 * 4. List all payment methods, assert all three appear (no filters, default
 *    pagination)
 * 5. Filter by one method_code and ensure only that method is returned
 * 6. Filter by is_active true and false, check sets
 * 7. Paginate: request page size one, verify all items appear across the pages
 * 8. Attempt access as unauthenticated user and confirm error
 */
export async function test_api_admin_payment_method_list_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword!123",
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as new admin
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword!123",
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create payment methods with variant values
  const methods = await ArrayUtil.asyncMap(
    [
      {
        method_code: `credit_card_${RandomGenerator.alphabets(4)}`,
        display_name: "Test Credit Card",
        is_active: true,
      },
      {
        method_code: `virtual_account_${RandomGenerator.alphabets(4)}`,
        display_name: "Test Virtual Account",
        is_active: false,
      },
      {
        method_code: `mobile_pay_${RandomGenerator.alphabets(4)}`,
        display_name: "Mobile Pay",
        is_active: true,
      },
    ] as const,
    async (spec) => {
      const result =
        await api.functional.aiCommerce.admin.paymentMethods.create(
          connection,
          {
            body: {
              ...spec,
            } satisfies IAiCommercePaymentMethod.ICreate,
          },
        );
      typia.assert(result);
      return result;
    },
  );

  // 4. List all payment methods - validate all three are present
  const allPage = await api.functional.aiCommerce.admin.paymentMethods.index(
    connection,
    {
      body: {} satisfies IAiCommercePaymentMethod.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.predicate(
    "all created payment methods appear in listing",
    methods.every((created) =>
      allPage.data.some((row) => row.id === created.id),
    ),
  );

  // 5. Filter by method_code
  const filterByCode =
    await api.functional.aiCommerce.admin.paymentMethods.index(connection, {
      body: {
        method_code: methods[1].method_code,
      } satisfies IAiCommercePaymentMethod.IRequest,
    });
  typia.assert(filterByCode);
  TestValidator.equals(
    "filtered by method_code returns correct method",
    filterByCode.data.length,
    1,
  );
  TestValidator.equals(
    "filtered method_code matches",
    filterByCode.data[0].id,
    methods[1].id,
  );

  // 6. Filter by is_active true
  const isActiveTrue =
    await api.functional.aiCommerce.admin.paymentMethods.index(connection, {
      body: {
        is_active: true,
      } satisfies IAiCommercePaymentMethod.IRequest,
    });
  typia.assert(isActiveTrue);
  TestValidator.equals(
    "filtered by is_active=true returns correct methods count",
    isActiveTrue.data.length,
    methods.filter((m) => m.is_active).length,
  );
  TestValidator.predicate(
    "all filtered (is_active=true) really are active",
    isActiveTrue.data.every((row) => row.is_active === true),
  );

  // 7. Filter by is_active false
  const isActiveFalse =
    await api.functional.aiCommerce.admin.paymentMethods.index(connection, {
      body: {
        is_active: false,
      } satisfies IAiCommercePaymentMethod.IRequest,
    });
  typia.assert(isActiveFalse);
  TestValidator.equals(
    "filtered by is_active=false returns correct methods count",
    isActiveFalse.data.length,
    methods.filter((m) => !m.is_active).length,
  );
  TestValidator.predicate(
    "all filtered (is_active=false) really are inactive",
    isActiveFalse.data.every((row) => row.is_active === false),
  );

  // 8. Pagination: limit 1 per page, loop through all possible pages
  const pageLimit = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  let seenIds = new Set<string>();
  let currentPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  while (seenIds.size < methods.length) {
    const paged = await api.functional.aiCommerce.admin.paymentMethods.index(
      connection,
      {
        body: {
          page: currentPage,
          limit: pageLimit,
        } satisfies IAiCommercePaymentMethod.IRequest,
      },
    );
    typia.assert(paged);
    if (paged.data.length > 0) {
      paged.data.forEach((row) => seenIds.add(row.id));
    }
    if (paged.pagination.pages <= currentPage) break;
    currentPage = (currentPage + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;
  }
  TestValidator.equals(
    "pagination covers all created methods",
    seenIds.size,
    methods.length,
  );

  // 9. Attempt listing as unauthenticated user (simulate unauth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access payment methods listing",
    async () => {
      await api.functional.aiCommerce.admin.paymentMethods.index(unauthConn, {
        body: {} satisfies IAiCommercePaymentMethod.IRequest,
      });
    },
  );
}

/**
 * - The implementation thoroughly follows the business scenario, using proper
 *   DTOs and correct function names and parameterization at each step.
 * - Type assertions (typia.assert) are utilized on all API responses with
 *   non-void values.
 * - Random data and enum respect TypeScript type/tag requirements.
 * - Await is used for every API and async function call, including inside
 *   TestValidator.error for async assertion.
 * - No additional imports are added outside the template block; all required
 *   types and values are derived from imports.
 * - For pagination, the correct integer type is enforced with a tag-casting
 *   pattern.
 * - No type errors, unsafe casts, or forbidden type validation logic is present.
 * - All TestValidator calls include a descriptive, scenario-specific title as
 *   their first parameter.
 * - Unauthenticated access is simulated by blank headers as per SDK guidelines.
 * - Function documentation at the top is comprehensive and step-by-step, matching
 *   scenario requirements.
 * - No prohibited code patterns (as any, type validation, etc.) are present.
 * - The implementation is well-commented and logical at each phase.
 * - All checklist and rules items are satisfied; there are no known errors,
 *   omissions, or warnings. No unnecessary null/undefined checks or redundant
 *   property checks are present.
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
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O All TestValidator functions include title as first parameter
 */
const __revise = {};
__revise;
