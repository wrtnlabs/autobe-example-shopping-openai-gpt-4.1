import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerStatusHistory";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSellerStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSellerStatusHistory";

/**
 * Validate advanced search, filter, and pagination for seller status
 * history by admin, including audit-sensitive events and edge cases.
 *
 * - Admin joins (creates platform admin account) and logs in to ensure
 *   authenticated privilege.
 * - Seller joins, establishing a test seller account.
 * - Seller creates a seller profile with random display name and metadata,
 *   initial approval_status='pending'.
 * - Admin updates the seller profile: changes approval_status to 'active',
 *   optionally adds suspension/penalty status, and sets transition
 *   reasons.
 * - Admin performs advanced search on seller status history: -- Filter by
 *   user_id (should yield at least one event). -- Filter by
 *   seller_profile_id (should yield matching status changes only). --
 *   Filter by date, page, and limit (including future/past dates for empty
 *   results). -- Filter by transition_reason string with partial/substring
 *   match. -- Search for specific new_status or previous_status values
 *   related to approval/suspension/penalty transitions. -- Paginate through
 *   status history results (including one-page edge case). -- Check empty
 *   result edge case: wrong user/profile id or impossible date range.
 * - Assert that result events include correct values for transition_actor,
 *   transition_reason, and status fields, and that no sensitive events are
 *   hidden for allowed admin role.
 * - Validate that pagination information matches query (page, limit, total
 *   records, total pages).
 * - Assert typia types at each step and check business field values.
 */
export async function test_api_admin_seller_status_history_advanced_search_pagination_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Admin onboarding & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);

  // Admin login (to get a fresh token)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 2. Seller onboarding & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(seller);

  // Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 3. Seller creates profile
  const sellerProfileBody = {
    user_id: seller.id,
    display_name: RandomGenerator.name(),
    profile_metadata: RandomGenerator.content({ paragraphs: 1 }),
    approval_status: "pending",
  } satisfies IAiCommerceSellerProfiles.ICreate;

  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);
  TestValidator.equals(
    "profile belongs to correct user",
    sellerProfile.user_id,
    seller.id,
  );

  // Switch to admin for privileged update
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 4. Admin updates profile to approved, then suspended (to ensure at least two events)
  const approvedProfile =
    await api.functional.aiCommerce.admin.sellerProfiles.update(connection, {
      sellerProfileId: sellerProfile.id,
      body: {
        approval_status: "active",
      } satisfies IAiCommerceSellerProfiles.IUpdate,
    });
  typia.assert(approvedProfile);
  TestValidator.equals(
    "profile approval status is active",
    approvedProfile.approval_status,
    "active",
  );

  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspendedProfile =
    await api.functional.aiCommerce.admin.sellerProfiles.update(connection, {
      sellerProfileId: sellerProfile.id,
      body: {
        approval_status: "suspended",
        suspension_reason: suspensionReason,
      } satisfies IAiCommerceSellerProfiles.IUpdate,
    });
  typia.assert(suspendedProfile);
  TestValidator.equals(
    "profile approval status is suspended",
    suspendedProfile.approval_status,
    "suspended",
  );
  TestValidator.equals(
    "suspension reason is set",
    suspendedProfile.suspension_reason,
    suspensionReason,
  );

  // 5. Search status history with various filters
  // -- By user_id
  const userIdSearchResult =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: seller.id,
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(userIdSearchResult);
  TestValidator.predicate(
    "result includes at least one event for user_id",
    userIdSearchResult.data.some((e) => e.user_id === seller.id),
  );

  // -- By seller_profile_id
  const profileIdSearchResult =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          seller_profile_id: sellerProfile.id,
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(profileIdSearchResult);
  TestValidator.predicate(
    "result includes events for seller_profile_id",
    profileIdSearchResult.data.some(
      (e) => e.seller_profile_id === sellerProfile.id,
    ),
  );

  // -- By previous_status and new_status
  const statusTransSearch =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: seller.id,
          previous_status: "active",
          new_status: "suspended",
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(statusTransSearch);
  TestValidator.predicate(
    "history contains activation -> suspension event",
    statusTransSearch.data.some(
      (e) => e.previous_status === "active" && e.new_status === "suspended",
    ),
  );

  // -- By transition_reason substring
  if (suspensionReason.length >= 5) {
    const keyword = suspensionReason.slice(0, 5);
    const reasonSearch =
      await api.functional.aiCommerce.admin.sellerStatusHistory.index(
        connection,
        {
          body: {
            user_id: seller.id,
            transition_reason: keyword,
          } satisfies IAiCommerceSellerStatusHistory.IRequest,
        },
      );
    typia.assert(reasonSearch);
    TestValidator.predicate(
      "matching event reason includes search substring",
      reasonSearch.data.some(
        (e) => e.transition_reason?.includes(keyword) ?? false,
      ),
    );
  }

  // -- Date filter boundary: after all events (should return zero results)
  const farFuture = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const futureSearch =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: seller.id,
          created_from: farFuture,
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "future date filter yields empty",
    futureSearch.data.length,
    0,
  );

  // -- Invalid user/profile id (should return empty)
  const emptySearch =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          seller_profile_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "nonexistent user/profile returns empty result",
    emptySearch.data.length,
    0,
  );

  // -- Pagination cases
  const fullList =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: seller.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(fullList);
  TestValidator.equals(
    "pagination returns one record as limit",
    fullList.data.length,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    fullList.pagination.limit,
    1,
  );
  TestValidator.equals("pagination page is 1", fullList.pagination.current, 1);

  // 6. Business content checks
  // At least one status history record should contain expected fields for suspension
  const allAuditEvents =
    await api.functional.aiCommerce.admin.sellerStatusHistory.index(
      connection,
      {
        body: {
          user_id: seller.id,
        } satisfies IAiCommerceSellerStatusHistory.IRequest,
      },
    );
  typia.assert(allAuditEvents);
  TestValidator.predicate(
    "history includes suspension event with correct actor",
    allAuditEvents.data.some(
      (e) =>
        e.new_status === "suspended" &&
        typeof e.transition_actor === "string" &&
        e.transition_actor.length > 0,
    ),
  );
  TestValidator.predicate(
    "history events always have ISO date",
    allAuditEvents.data.every(
      (e) => typeof e.created_at === "string" && e.created_at.includes("T"),
    ),
  );
}

/**
 * - All API calls are awaited and use proper parameter structures as per SDK
 *   documentation.
 * - No additional import statements or require() calls are present; only
 *   template-provided imports are used.
 * - All request bodies are built following the correct satisfies pattern without
 *   type annotation; no mutations or reassignments of request body variables.
 * - Random data (emails, passwords, display names, metadata) are generated with
 *   correct typia/RandomGenerator calls and constraints.
 * - All TestValidator assertions use descriptive title as first parameter, with
 *   correct actual/expected type order, and only real properties tested. All
 *   TestValidator.error usage is skipped since all tested scenarios are
 *   business logic and audit correctness, not intentional runtime errors.
 * - All API endpoints and types used are provided in the scenario's materials; no
 *   invented APIs, enums, or properties are used.
 * - Pagination logic adheres to real DTO tag types and uses valid type assertions
 *   for page/limit numbers.
 * - All typia.assert() usages are correct; no redundant manual property checks
 *   after assert.
 * - No illogical business sequence or unauthorized role-mix: account roles switch
 *   before each privileged action as needed.
 * - No status code checking or response type validation after typia.assert().
 * - No as any / type-bypassing or wrong data in requests. All fields use proper
 *   values (no missing required fields, invalid types, or field
 *   hallucinations).
 * - All Date handling uses .toISOString() for filter/future tests and created_at
 *   fields.
 * - No forbidden code patterns or hallucination/fictional APIs.
 * - Each edge case (future/empty profile, pagination, wrong user/profile id) is
 *   implemented and validated with correct logic.
 * - All required rules, final checklist, and quality standards are satisfied.
 * - No compilation error scenarios, imports, or markdown blocks present.
 * - Workflow, validation, and error assertion patterns match the best practices
 *   section.
 * - Code is clean, readable, and maintainable; all variables and calls have
 *   meaningful, context-appropriate names.
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O EVERY api.functional.* call has await
 *   - O All API calls use proper parameter structure and type safety
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O Proper async/await usage
 */
const __revise = {};
__revise;
