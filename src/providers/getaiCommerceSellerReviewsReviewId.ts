import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get detail of a specific review (ai_commerce_reviews).
 *
 * Fetches a single review from ai_commerce_reviews using the provided reviewId.
 * The seller may access only reviews on products they own. Returns all review
 * base fields in strict DTO format.
 *
 * Authorization: Only a seller whose seller account owns the product associated
 * with the review may access this data. Throws if the review does not exist,
 * the seller does not exist, or the seller is not authorized.
 *
 * @param props - Input props ({ seller: SellerPayload, reviewId: string &
 *   tags.Format<'uuid'> })
 * @param props.seller - Authenticated seller payload (must be active and not
 *   deleted)
 * @param props.reviewId - The review UUID to fetch
 * @returns IAiCommerceReview - The detailed review object (all fields,
 *   compliance with date formatting)
 * @throws {Error} When the review is not found, the product is not owned by the
 *   seller, or ownership validation fails.
 */
export async function getaiCommerceSellerReviewsReviewId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceReview> {
  const { seller, reviewId } = props;

  // Step 1: Fetch the review
  const review = await MyGlobal.prisma.ai_commerce_reviews.findUnique({
    where: { id: reviewId },
  });
  if (!review) {
    throw new Error("Review not found");
  }

  // Step 2: Fetch the order item for the review
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findUnique({
    where: { id: review.order_item_id },
  });
  if (!orderItem) {
    throw new Error("Order item not found");
  }

  // Step 3: Fetch the product variant and product for the order item
  const productVariant =
    await MyGlobal.prisma.ai_commerce_product_variants.findUnique({
      where: { id: orderItem.product_variant_id },
    });
  if (!productVariant) {
    throw new Error("Product variant not found");
  }

  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productVariant.product_id },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // Step 4: Fetch the seller's database id (ai_commerce_seller) by buyer_id
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
    },
  });
  if (!sellerRow) {
    throw new Error("Seller not found or inactive");
  }

  // Step 5: Check authorization - only the product owner seller may access
  if (product.seller_id !== sellerRow.id) {
    throw new Error("Unauthorized: seller does not own the reviewed product");
  }

  // Step 6: Build DTO (all date fields must use toISOStringSafe)
  return {
    id: review.id,
    author_id: review.author_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    body: review.body,
    seller_response: review.seller_response ?? undefined,
    visibility: review.visibility,
    status: review.status,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
  };
}
