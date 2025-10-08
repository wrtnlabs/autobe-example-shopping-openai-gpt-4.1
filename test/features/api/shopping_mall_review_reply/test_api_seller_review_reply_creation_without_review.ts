import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that when a seller attempts to reply to a review that does not exist for
 * their product, a validation or not found error is returned.
 *
 * 1. Register a new seller account (join as seller)
 * 2. Authenticate as that seller (token handled by SDK)
 * 3. Attempt to create a review reply with random (non-existent) productId and
 *    reviewId
 * 4. Assert that an error is returned from the API (not success)
 */
export async function test_api_seller_review_reply_creation_without_review(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email: sellerEmail,
    password: "password",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinInput });
  typia.assert(seller);

  // 2. Prepare input for invalid reply creation
  const randomProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick(["public", "hidden"] as const),
  } satisfies IShoppingMallReviewReply.ICreate;

  // 3. Attempt to create a reply on non-existent review and product
  await TestValidator.error(
    "should not allow seller to reply to a non-existent review",
    async () => {
      await api.functional.shoppingMall.seller.products.reviews.replies.create(
        connection,
        {
          productId: randomProductId,
          reviewId: randomReviewId,
          body: replyBody,
        },
      );
    },
  );
}
