import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate full administrator access when listing comments for a product
 * review.
 *
 * Business context: To ensure robust moderation and audit coverage,
 * administrators must have unrestricted visibility into all comments tied to
 * any product review. This includes public, private, and (where supported by
 * the model) soft-deleted comments, although this test focuses on
 * public/private due to API limitations. By confirming that the admin receives
 * all comments regardless of privacy flag or review ownership, the system
 * guarantees full access for compliance, investigation, and content
 * governance.
 *
 * Steps:
 *
 * 1. Create a review as a customer (for a fresh product id)
 * 2. Post both a public and a private comment on that review as the customer
 * 3. (Optional - soft-delete not tested due to API limitation)
 * 4. As administrator, query the list of all comments for the review
 * 5. Assert all comments are present and include required summary fields
 * 6. Check neither public nor private comments are omitted
 * 7. Enforce that only allowed summary fields are present in the admin response
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_list_review_comments_admin_full_access(
  connection: api.IConnection,
) {
  // 1. Create a review as a customer
  const productId = typia.random<string & tags.Format<"uuid">>();
  const reviewInput = {
    product_id: productId,
    title: "Complete admin audit review",
    body: "End-to-end test for admin listing all review comments (public/private)",
    rating: 5,
  } satisfies IAimallBackendReview.ICreate;
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 2. Post public and private comments on the review
  const commentsToCreate = [
    { body: "Visible-to-all comment", is_private: false },
    { body: "Admin-only private comment", is_private: true },
  ];
  const createdComments: IAimallBackendComment[] = [];
  for (const input of commentsToCreate) {
    const comment =
      await api.functional.aimall_backend.customer.reviews.comments.create(
        connection,
        {
          reviewId: review.id,
          body: { ...input },
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 3. Soft-delete scenario skipped (no API support)

  // 4. Retrieve all comments as admin
  const adminComments =
    await api.functional.aimall_backend.administrator.reviews.comments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(adminComments);

  // 5. Check all created comments (by ID) are in admin result
  TestValidator.equals("admin receives all review comments")(
    adminComments.data?.length,
  )(createdComments.length);

  for (const original of createdComments) {
    const summary = adminComments.data?.find((x) => x && x.id === original.id);
    TestValidator.predicate(`comment id ${original.id} is listed for admin`)(
      !!summary,
    );
    if (summary) {
      TestValidator.equals("comment body matches")(summary.body)(original.body);
      TestValidator.equals("is_private flag matches")(summary.is_private)(
        original.is_private,
      );
      TestValidator.equals("author matches")(summary.customer_id)(
        original.customer_id,
      );
    }
  }

  // 6. Validate only summary fields returned in admin listing
  for (const comment of adminComments.data ?? []) {
    const allowed = ["id", "body", "customer_id", "created_at", "is_private"];
    for (const k of Object.keys(comment)) {
      TestValidator.predicate(`summary output only key '${k}' expected`)(
        allowed.includes(k),
      );
    }
  }
}
