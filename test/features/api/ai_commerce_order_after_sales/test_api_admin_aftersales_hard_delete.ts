import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E test: Admin hard delete of after-sales case (order-level).
 *
 * Validates business logic for admin-only, irreversible deletion of
 * after-sales records:
 *
 * 1. Register and login as admin (capture credentials for context switches).
 * 2. Register and login as buyer (capture credentials for order creation and
 *    after-sales creation).
 * 3. Buyer creates a valid order with randomized required fields (use
 *    typia.random and RandomGenerator).
 * 4. Buyer files a new after-sales case linked to that order.
 * 5. Switch authentication to admin (login to set token on connection).
 * 6. Admin deletes the after-sales case for the order.
 *
 *    - Expect no return value (void, HTTP 204/200).
 * 7. Try deleting the same after-sales case a second time (should fail with
 *    error).
 *
 *    - Validate business rule: cannot delete nonexistent case
 *         (TestValidator.error).
 * 8. Switch to buyer and try to delete any after-sales case (should be
 *    forbidden/unauthorized) -- TestValidator.error.
 * 9. (Optional) Attempt to delete a non-existent after-sales case ID (random
 *    UUID that never existed) as admin (TestValidator.error).
 * 10. (Optional) If after-sales status not deletable in certain states,
 *     manipulate or re-create non-deletable after-sales and attempt delete
 *     for status-restricted check.
 */
export async function test_api_admin_aftersales_hard_delete(
  connection: api.IConnection,
) {
  // 1. Register admin and capture login info.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 2. Register buyer and login.
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });

  // 3. Login as buyer (sets token in connection)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 4. Buyer creates a new order (all required fields randomized, including one line item)
  const orderInput = typia.random<IAiCommerceOrder.ICreate>();
  orderInput.buyer_id = (
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
      } satisfies IBuyer.ILogin,
    })
  ).id;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderInput,
    },
  );
  typia.assert(order);

  // 5. Buyer files new after-sales case
  const afterSalesInput = typia.random<IAiCommerceOrderAfterSales.ICreate>();
  const afterSales =
    await api.functional.aiCommerce.buyer.orders.afterSales.create(connection, {
      orderId: order.id,
      body: afterSalesInput,
    });
  typia.assert(afterSales);

  // 6. Admin login for delete rights
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. Admin performs hard delete
  await api.functional.aiCommerce.admin.orders.afterSales.erase(connection, {
    orderId: order.id,
    afterSalesId: afterSales.id,
  });

  // 8. Try deleting same after-sales case a second time (should error)
  await TestValidator.error(
    "second deletion of after-sales must fail",
    async () => {
      await api.functional.aiCommerce.admin.orders.afterSales.erase(
        connection,
        {
          orderId: order.id,
          afterSalesId: afterSales.id,
        },
      );
    },
  );

  // 9. Switch back to buyer (buyer token)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 10. Buyer tries to delete any after-sales case (must fail -- permission check)
  await TestValidator.error(
    "buyer cannot delete after-sales case",
    async () => {
      await api.functional.aiCommerce.admin.orders.afterSales.erase(
        connection,
        {
          orderId: order.id,
          afterSalesId: afterSales.id,
        },
      );
    },
  );

  // 11. Admin login again for error case
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 12. Try to delete a non-existent after-salesId
  await TestValidator.error(
    "delete non-existent after-salesId fails",
    async () => {
      await api.functional.aiCommerce.admin.orders.afterSales.erase(
        connection,
        {
          orderId: order.id,
          afterSalesId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // (Optional, business rule enforcement): Status-based non-deletable after-sales is not reproducible here without more info.
}

/**
 * - Verified that all actions are using only valid DTOs and API functions as
 *   described in the scenario and materials.
 * - Authentication roles are correctly handled using only provided SDK functions;
 *   headers are never manipulated directly.
 * - All input variables use correct tagged random generation (typia.random,
 *   RandomGenerator), and request bodies use the satisfies pattern.
 * - No non-existent properties are ever created, and all fields come directly
 *   from DTO schemas.
 * - TestValidator.error() always gets a descriptive title and is always awaited,
 *   never sync for async functions.
 * - All API functions are properly awaited; no missing awaits.
 * - No type errors or forbidden patterns (never any as any or missing fields) are
 *   present.
 * - All assertions are business-logic runtime errors, not type errors or status
 *   code assertions.
 * - No additional imports are present, and only template-provided code is used.
 * - Follows clean, logical business workflow and simulates realistic role
 *   switching for authorization boundaries.
 * - Only a single function is defined; no extraneous helpers or variables outside
 *   main function.
 * - No violations of absolute prohibitions found.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O EVERY TestValidator function has a descriptive title
 *   - O NO fictional functions or types from examples used
 *   - O All DTOs and API functions match provided materials
 *   - O ONLY uses properties/methods from DTOs/API provided
 *   - O All TestValidator.error() with async receives await
 *   - O All error scenarios involve valid runtime business cases only
 *   - O No missing required fields in any request
 *   - O No unreachable or illogical code paths
 */
const __revise = {};
__revise;
