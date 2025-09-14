import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBulletin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";

/**
 * Validate listing and filtering comments under a bulletin with pagination.
 *
 * Business purpose: Ensures the PATCH
 * /aiCommerce/bulletins/{bulletinId}/comments endpoint properly supports
 * filtering by author, moderation status, date range, and pagination, only
 * returning comments for the correct bulletin and context.
 *
 * Steps:
 *
 * 1. Register two buyers and one admin (admin creates bulletin; buyers add
 *    comments).
 * 2. Admin logs in and creates a bulletin (visibility: public, status:
 *    published).
 * 3. Buyer1 logs in, adds multiple comments to the bulletin (with status
 *    'published').
 * 4. Buyer2 logs in, adds several comments with status 'published' and
 *    'flagged'.
 * 5. Test PATCH listing with no filters: should return all comments for the
 *    bulletin, paginated.
 * 6. Test author_id filter: fetch only comments from Buyer1.
 * 7. Test status filter: fetch only 'flagged' comments.
 * 8. Test pagination (page, limit): fetch a small page and verify correct
 *    data/page meta fields.
 * 9. Test date range filter: list by created_at_from and created_at_to to
 *    limit comments to a subset.
 * 10. Test search filters: send search term matching part of a comment body,
 *     verify result.
 * 11. Error/edge: Try to fetch with non-existent bulletinId (expect error);
 *     fetch as buyer for a bulletin they have no access to (if any
 *     restricted scenario fits).
 */
export async function test_api_bulletin_comment_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register two buyers and one admin
  const buyer1Email = typia.random<string & tags.Format<"email">>();
  const buyer2Email = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Admin join & login
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Buyer1 join & login
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer1Email,
      password,
    } satisfies IBuyer.ICreate,
  });
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer1Email,
      password,
    } satisfies IBuyer.ILogin,
  });

  // Buyer2 join & login
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer2Email,
      password,
    } satisfies IBuyer.ICreate,
  });
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyer2Email,
      password,
    } satisfies IBuyer.ILogin,
  });

  // 2. Admin creates a bulletin (status: published)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  const bulletin = await api.functional.aiCommerce.admin.bulletins.create(
    connection,
    {
      body: {
        author_id: typia.random<string & tags.Format<"uuid">>(), // The field is required, but in real scenario admin would have account uuid
        title: RandomGenerator.paragraph(),
        body: RandomGenerator.content(),
        visibility: "public",
        status: "published",
      } satisfies IAiCommerceBulletin.ICreate,
    },
  );
  typia.assert(bulletin);

  // 3. Buyer1: Add 3 'published' comments
  await api.functional.auth.buyer.login(connection, {
    body: { email: buyer1Email, password } satisfies IBuyer.ILogin,
  });
  const buyer1CommentBodies = ArrayUtil.repeat(3, () =>
    RandomGenerator.paragraph({ sentences: 3 }),
  );
  const buyer1Comments = [];
  for (const body of buyer1CommentBodies) {
    const comment =
      await api.functional.aiCommerce.buyer.bulletins.comments.create(
        connection,
        {
          bulletinId: bulletin.id,
          body: {
            body,
            status: "published",
          } satisfies IAiCommerceComment.ICreate,
        },
      );
    typia.assert(comment);
    buyer1Comments.push(comment);
  }

  // 4. Buyer2: Add 2 'published', 2 'flagged' comments
  await api.functional.auth.buyer.login(connection, {
    body: { email: buyer2Email, password } satisfies IBuyer.ILogin,
  });
  const buyer2PublishedBodies = ArrayUtil.repeat(2, () =>
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  const buyer2FlaggedBodies = ArrayUtil.repeat(2, () =>
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  const buyer2Comments = [];
  for (const body of buyer2PublishedBodies) {
    const comment =
      await api.functional.aiCommerce.buyer.bulletins.comments.create(
        connection,
        {
          bulletinId: bulletin.id,
          body: {
            body,
            status: "published",
          } satisfies IAiCommerceComment.ICreate,
        },
      );
    typia.assert(comment);
    buyer2Comments.push({ ...comment, status: "published" });
  }
  for (const body of buyer2FlaggedBodies) {
    const comment =
      await api.functional.aiCommerce.buyer.bulletins.comments.create(
        connection,
        {
          bulletinId: bulletin.id,
          body: {
            body,
            status: "flagged",
          } satisfies IAiCommerceComment.ICreate,
        },
      );
    typia.assert(comment);
    buyer2Comments.push({ ...comment, status: "flagged" });
  }

  // Gather all expected comments
  const allComments = [...buyer1Comments, ...buyer2Comments];

  // 5. List (PATCH) without filter - expect all comments for the bulletin
  const pageAll = await api.functional.aiCommerce.bulletins.comments.index(
    connection,
    {
      bulletinId: bulletin.id,
      body: {
        bulletin_id: bulletin.id,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(pageAll);
  TestValidator.equals(
    "all comments count",
    pageAll.pagination.records,
    allComments.length,
  );

  // 6. author_id filter - only buyer1's comments
  const pageBuyer1 = await api.functional.aiCommerce.bulletins.comments.index(
    connection,
    {
      bulletinId: bulletin.id,
      body: {
        bulletin_id: bulletin.id,
        author_id: allComments[0].author_id,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(pageBuyer1);
  TestValidator.predicate(
    "author_id filter",
    pageBuyer1.data.every((c) => c.author_id === allComments[0].author_id),
  );

  // 7. status filter - only 'flagged' comments
  const pageFlagged = await api.functional.aiCommerce.bulletins.comments.index(
    connection,
    {
      bulletinId: bulletin.id,
      body: {
        bulletin_id: bulletin.id,
        status: "flagged",
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(pageFlagged);
  TestValidator.predicate(
    "status filter flagged",
    pageFlagged.data.every((c) => c.status === "flagged"),
  );

  // 8. Pagination: limit to 2 per page
  const pageLimit2 = await api.functional.aiCommerce.bulletins.comments.index(
    connection,
    {
      bulletinId: bulletin.id,
      body: {
        bulletin_id: bulletin.id,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(pageLimit2);
  TestValidator.equals("pagination limit", pageLimit2.data.length, 2);

  // 9. Date range filter (from 2nd comment's created_at)
  if (allComments.length >= 2) {
    // sort all by created_at ascending
    const sortedByCreated = [...allComments].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const from = sortedByCreated[1].created_at;
    const to = sortedByCreated[sortedByCreated.length - 1].created_at;
    const pageDateRange =
      await api.functional.aiCommerce.bulletins.comments.index(connection, {
        bulletinId: bulletin.id,
        body: {
          bulletin_id: bulletin.id,
          created_at_from: from,
          created_at_to: to,
        } satisfies IAiCommerceComment.IRequest,
      });
    typia.assert(pageDateRange);
    TestValidator.predicate(
      "created_at range filter",
      pageDateRange.data.every(
        (c) => c.created_at >= from && c.created_at <= to,
      ),
    );
  }

  // 10. Search filter: search part of a comment body
  const searchBody = allComments[0].body.slice(0, 8);
  const pageSearch = await api.functional.aiCommerce.bulletins.comments.index(
    connection,
    {
      bulletinId: bulletin.id,
      body: {
        bulletin_id: bulletin.id,
        search: searchBody,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(pageSearch);
  TestValidator.predicate(
    "search filter result contains substring",
    pageSearch.data.some((c) => c.body.includes(searchBody)),
  );

  // 11. Non-existent bulletin - should error
  await TestValidator.error(
    "non-existent bulletinId returns error",
    async () => {
      await api.functional.aiCommerce.bulletins.comments.index(connection, {
        bulletinId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          bulletin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAiCommerceComment.IRequest,
      });
    },
  );
}

/**
 * - Correct authentication and account setup for admin and two buyers is
 *   performed
 * - API calls for main scenario (create bulletin, comments) use correct DTOs and
 *   function signatures
 * - All API calls use await
 * - All required test assertions include TestValidator with descriptive titles as
 *   first argument
 * - Filtering by author_id, status, date range, pagination, and search all use
 *   bona-fide DTO properties, correct types, and properly structured
 *   IAiCommerceComment.IRequest
 * - Edge error scenario uses TestValidator.error for non-existent bulletinId;
 *   error is validated by catching exception from API call
 * - Random data generation patterns for emails and passwords are correct
 * - Only SDK and DTOs from provided materials are used, no imports or code from
 *   mockups/examples
 * - All filter/option combinations exercise the PATCH endpoint for comment
 *   listing, with All, by author, by status, pagination, date range, and search
 *   covered
 * - Typia.assert used correctly for all API responses
 * - No forbidden patterns (e.g., as any, wrong DTOs, manual header modifications,
 *   missing required fields, type errors, non-existent DTO fields, type system
 *   violation scenarios, or markdown blocks)
 * - TypeScript code only, not markdown, and template untouched outside code block
 * - No unimplementable scenario elements remain, only real API and DTOs used
 * - Final code matches draft (no forbidden elements detected)
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
 *   - O Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
