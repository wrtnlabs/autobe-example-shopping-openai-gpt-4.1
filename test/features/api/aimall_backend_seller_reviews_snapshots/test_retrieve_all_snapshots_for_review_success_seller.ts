import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Verify that an authenticated seller can retrieve all snapshots attached to a
 * specific product review.
 *
 * This test ensures that sellers have correct permission to see the
 * images/media (snapshots) that customers have attached (or sellers have
 * uploaded) to reviews of their own products. Snapshots must be retrievable by
 * seller for their own product's review, linked properly.
 *
 * Workflow:
 *
 * 1. Seller account is created.
 * 2. Seller creates a product listing (with synthetic category).
 * 3. A customer review is created for the seller's product.
 * 4. Two snapshots (images, with distinct URIs/captions) are uploaded to the
 *    review.
 * 5. The seller requests all snapshots of the review using the API.
 * 6. Assert all uploaded snapshots are returned, properly linked by media_uri and
 *    count.
 */
export async function test_api_aimall_backend_seller_reviews_snapshots_index_success(
  connection: api.IConnection,
) {
  // 1. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(8),
    email: sellerEmail,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerCreate },
    );
  typia.assert(seller);

  // 2. Create product assigned to seller (random category)
  const productCreate: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()(1)(),
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(product);

  // 3. Create review (customer review for product)
  const reviewCreate: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: "Great product!",
    body: "I like this item a lot!",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewCreate },
  );
  typia.assert(review);

  // 4. Upload two snapshots for that review
  const snapshotInputs: IAimallBackendSnapshot.ICreate[] = [
    {
      product_id: product.id,
      customer_id: review.customer_id,
      media_uri: "https://picsum.photos/seed/aaa/600/400",
      caption: "Photo 1",
    },
    {
      product_id: product.id,
      customer_id: review.customer_id,
      media_uri: "https://picsum.photos/seed/bbb/600/400",
      caption: "Photo 2",
    },
  ];
  const createdSnapshots: IAimallBackendSnapshot[] = [];
  for (const input of snapshotInputs) {
    const snapshot =
      await api.functional.aimall_backend.seller.reviews.snapshots.create(
        connection,
        { reviewId: review.id, body: input },
      );
    typia.assert(snapshot);
    createdSnapshots.push(snapshot);
  }

  // 5. Seller requests all snapshots for the review
  const page =
    await api.functional.aimall_backend.seller.reviews.snapshots.index(
      connection,
      { reviewId: review.id },
    );
  typia.assert(page);
  TestValidator.predicate("snapshots array present")(
    Array.isArray(page.data) && page.data.length >= snapshotInputs.length,
  );
  TestValidator.equals("snapshot count matches")(page.data?.length)(
    snapshotInputs.length,
  );

  // 6. Check all uploaded URIs appear in result
  for (const input of snapshotInputs) {
    TestValidator.predicate(`snapshot [${input.media_uri}] in result`)(
      page.data?.some((snap) => snap.media_uri === input.media_uri) === true,
    );
  }
}
