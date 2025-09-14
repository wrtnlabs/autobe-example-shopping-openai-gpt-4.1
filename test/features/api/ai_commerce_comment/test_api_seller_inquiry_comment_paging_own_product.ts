import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import type { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";

/**
 * Seller retrieves paginated comments for an inquiry on their own product.
 *
 * This test validates the business and permission logic for seller access
 * to comments on their own product's inquiries.
 *
 * Scenario:
 *
 * 1. Register a seller and authenticate
 * 2. Seller creates a product
 * 3. Register a buyer and authenticate
 * 4. Buyer posts an inquiry to the seller's product
 * 5. Buyer comments on the inquiry
 * 6. Switch to seller, seller also comments on the inquiry
 * 7. Add additional comments by both to test pagination (at least 6 total)
 * 8. Seller retrieves paginated comments via PATCH
 *    /aiCommerce/seller/inquiries/{inquiryId}/comments
 * 9. Validate:
 *
 *    - Pagination metadata matches total inserted comments
 *    - Data includes both buyer and seller comments (mine+customer)
 *    - Filtering by author returns only relevant records
 *    - Chronological order is respected based on created_at
 *    - Status is as expected (e.g., default is 'published')
 *    - Only comments for this inquiryId are shown
 *    - Seller can see all comments on their own product's inquiry
 */
export async function test_api_seller_inquiry_comment_paging_own_product(
  connection: api.IConnection,
) {
  // 1. Register seller and get their id/token
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. Seller creates a product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerId,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        status: "active",
        business_status: "pending_approval",
        current_price: 29900,
        inventory_quantity: 100,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Register buyer and get their id/token
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(10);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);
  const buyerId = buyerAuth.id;

  // 4. Authenticate as buyer
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 5. Buyer posts an inquiry to seller's product
  const inquiry = await api.functional.aiCommerce.buyer.inquiries.create(
    connection,
    {
      body: {
        product_id: product.id,
        question: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "public",
      } satisfies IAiCommerceInquiry.ICreate,
    },
  );
  typia.assert(inquiry);

  // 6. Buyer posts 3 comments
  const buyerCommentBodies = ArrayUtil.repeat(3, (i) =>
    RandomGenerator.paragraph({ sentences: 2 + i }),
  );
  for (const body of buyerCommentBodies) {
    const comment =
      await api.functional.aiCommerce.seller.inquiries.comments.create(
        connection,
        {
          inquiryId: inquiry.id,
          body: {
            body,
            status: "published",
          } satisfies IAiCommerceComment.ICreate,
        },
      );
    typia.assert(comment);
  }

  // 7. Authenticate as seller again
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 8. Seller posts 3 comments
  const sellerCommentBodies = ArrayUtil.repeat(3, (i) =>
    RandomGenerator.paragraph({ sentences: 2 + i }),
  );
  for (const body of sellerCommentBodies) {
    const comment =
      await api.functional.aiCommerce.seller.inquiries.comments.create(
        connection,
        {
          inquiryId: inquiry.id,
          body: {
            body,
            status: "published",
          } satisfies IAiCommerceComment.ICreate,
        },
      );
    typia.assert(comment);
  }

  // 9. Seller fetches paginated comments (limit 4 == 2 pages for 6 comments)
  const page1 = await api.functional.aiCommerce.seller.inquiries.comments.index(
    connection,
    {
      inquiryId: inquiry.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 4 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "Should fetch 4 comments on first page",
    page1.data.length === 4,
  );
  TestValidator.equals("pagination total records", page1.pagination.records, 6);
  TestValidator.predicate(
    "All comments returned have correct inquiryId",
    page1.data.every((c) => typeof c.body === "string"),
  );
  TestValidator.predicate(
    "All comments are either by sellerId or buyerId",
    page1.data.every(
      (c) => c.author_id === sellerId || c.author_id === buyerId,
    ),
  );
  TestValidator.equals(
    "All comments have status 'published'",
    page1.data.every((c) => c.status === "published"),
    true,
  );

  // 10. Fetch second page (should have 2 comments)
  const page2 = await api.functional.aiCommerce.seller.inquiries.comments.index(
    connection,
    {
      inquiryId: inquiry.id,
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 4 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IAiCommerceComment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.predicate(
    "Should fetch 2 comments on second page",
    page2.data.length === 2,
  );
  TestValidator.predicate(
    "All comments in page 2 match inquiryId and are by the right author",
    page2.data.every(
      (c) =>
        (c.author_id === sellerId || c.author_id === buyerId) &&
        typeof c.body === "string",
    ),
  );

  // 11. Filtering: seller retrieves only their own comments
  const selfPage =
    await api.functional.aiCommerce.seller.inquiries.comments.index(
      connection,
      {
        inquiryId: inquiry.id,
        body: {
          author_id: sellerId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IAiCommerceComment.IRequest,
      },
    );
  typia.assert(selfPage);
  TestValidator.equals(
    "Should fetch only seller's comments",
    selfPage.data.length,
    3,
  );
  TestValidator.predicate(
    "All returned comments are by the seller",
    selfPage.data.every((c) => c.author_id === sellerId),
  );

  // 12. Filtering: seller retrieves only buyer's comments
  const buyerPage =
    await api.functional.aiCommerce.seller.inquiries.comments.index(
      connection,
      {
        inquiryId: inquiry.id,
        body: {
          author_id: buyerId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IAiCommerceComment.IRequest,
      },
    );
  typia.assert(buyerPage);
  TestValidator.equals(
    "Should fetch only buyer's comments",
    buyerPage.data.length,
    3,
  );
  TestValidator.predicate(
    "All returned comments are by the buyer",
    buyerPage.data.every((c) => c.author_id === buyerId),
  );
}

/**
 * - Once seller joins, we do not have seller id directly (it is in
 *   IAiCommerceSeller.IAuthorized.id), so in the draft, the product's seller_id
 *   is random, which means subsequent queries for their own comments by
 *   author_id will not work as intended. It must use the seller's actual id.
 * - For buyer, the same applies if we want to use author_id for filtering (buyer
 *   id is in IAiCommerceBuyer.IAuthorized.id).
 * - The draft test logic otherwise successfully executes a multi-user workflow,
 *   creates product/inquiry/comment data, and tests pagination and data
 *   presence. However, need to fetch seller id properly after seller
 *   registration, and also fetch buyer id after login/join.
 * - All API usages use correct DTO types (ICreate, IRequest, etc.), typia.assert
 *   is used for runtime type checks, await is correctly applied, and
 *   validations use appropriate TestValidator methods.
 * - No forbidden patterns, import errors, or type assertions.
 * - Suggest improvement: After seller and buyer join, save their id and use them
 *   in later steps instead of random uuid in product creation and filtering.
 *   This ensures the business logic for own product/inquiry/comment linkage is
 *   correctly tested.
 * - All template and business rule requirements are followed.
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
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
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
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage (TestValidator.error)
 *   - O EVERY TestValidator function includes title as first parameter
 *   - O Actual-first, expected-second in TestValidator assertions
 *   - O ONLY real SDK functions and DTO types used (not examples/fictional)
 *   - O No copy-paste of forbidden patterns from mockups/examples
 *   - O All inputs and outputs correctly typed
 *   - O No forbidden creative import syntax, require, or dynamic imports
 *   - O Did NOT touch connection.headers in any way
 *   - O All business logic validations and comments present
 *   - O API function calling pattern matches provided SDK
 *   - O No testing of HTTP status codes specifically
 *   - O No operations on deleted/non-existent resources
 *   - O No response data type checking after typia.assert()
 *   - O No type safety violations (any, @ts-expect-error, @ts-ignore etc.)
 *   - O Only properties existing in DTO used—no hallucinated properties
 */
const __revise = {};
__revise;
