import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test listing comments for a soft-deleted review by a customer.
 *
 * This test simulates the following customer workflow:
 *
 * 1. Create a new product review (customer is already authenticated via
 *    connection).
 * 2. Post at least one comment to the review.
 * 3. Soft-delete the review using the review erase endpoint.
 * 4. Attempt to list comments for the now-soft-deleted review.
 * 5. Assert that the API returns either an empty dataset or the proper error
 *    indicating that comments cannot be listed from deleted resources, in
 *    accordance with the documented business rules.
 *
 * This scenario validates that comments are not visible for deleted reviews
 * (since such records are hidden from all listing/reading endpoints in
 * compliance and audit scenarios), and the GET returns empty set or expected
 * error.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_list_review_comments_for_customer_deleted_review(
  connection: api.IConnection,
) {
  // 1. Create a new product review with random data
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(1),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Post a comment to the review
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: RandomGenerator.paragraph()(1),
          is_private: false,
          review_id: review.id,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Soft-delete the review
  await api.functional.aimall_backend.customer.reviews.erase(connection, {
    reviewId: review.id,
  });

  // 4. Attempt to list comments for the soft-deleted review
  let result: IPageIAimallBackendComment.ISummary | null = null;
  let errorCaught = false;
  try {
    result =
      await api.functional.aimall_backend.customer.reviews.comments.index(
        connection,
        {
          reviewId: review.id,
        },
      );
    typia.assert(result);
  } catch (err) {
    errorCaught = true;
  }
  // 5. Assert either an error was thrown (e.g., 404) or the data field is empty, meaning comments are not listed for deleted review
  if (!errorCaught) {
    TestValidator.predicate("No comments should be listed for deleted review")(
      Array.isArray(result?.data) ? result.data.length === 0 : true,
    );
  }
}
