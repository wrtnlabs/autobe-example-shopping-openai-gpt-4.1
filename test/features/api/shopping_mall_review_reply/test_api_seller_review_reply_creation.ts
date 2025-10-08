import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that an authenticated seller can successfully create a public reply to
 * a customer review for their own product.
 *
 * 1. Register a new seller account and authenticate.
 * 2. Simulate an existing product UUID and review UUID (since no API is available
 *    for listing or creating them).
 * 3. Attempt to create a reply to the review for the product with valid reply body
 *    and 'public' status.
 * 4. Validate reply creation succeeds and returns the expected reply data.
 * 5. Confirm fields like author (sellerId), status, body, and audit timestamps are
 *    properly returned.
 */
export async function test_api_seller_review_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Seller registration & authentication
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);

  // Step 2: Use randomly generated productId and reviewId for test (simulate existing review)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare reply creation body
  const replyInput = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
    status: "public",
  } satisfies IShoppingMallReviewReply.ICreate;

  // Step 4: Create a reply as the authenticated seller
  const reply =
    await api.functional.shoppingMall.seller.products.reviews.replies.create(
      connection,
      {
        productId,
        reviewId,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // Step 5: Check reply fields and ownership
  TestValidator.equals("reply author is seller", reply.sellerId, sellerAuth.id);
  TestValidator.equals(
    "reply productId matches input",
    reply.productId,
    productId,
  );
  TestValidator.equals(
    "reply reviewId matches input",
    reply.reviewId,
    reviewId,
  );
  TestValidator.equals("reply body matches input", reply.body, replyInput.body);
  TestValidator.equals("reply status is public", reply.status, "public");
  TestValidator.predicate(
    "reply createdAt is ISO string",
    typeof reply.createdAt === "string" && !isNaN(Date.parse(reply.createdAt)),
  );
  TestValidator.predicate(
    "reply updatedAt is ISO string",
    typeof reply.updatedAt === "string" && !isNaN(Date.parse(reply.updatedAt)),
  );
}
