import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update the content, rating, or seller response of a review
 * (ai_commerce_reviews table).
 *
 * This API allows a seller to provide or update their response
 * (seller_response) to a product review, but only for reviews on their own
 * products. Other fields (e.g., rating, body, visibility, status) are NOT
 * editable via this endpoint for sellers.
 *
 * Authorization logic ensures only the seller for the reviewed product can
 * update seller_response. The function fetches the review, performs required
 * chain of ownership checks, and performs an update of seller_response. All
 * date fields are handled as string & tags.Format<'date-time'>. Native Date
 * type is NOT used anywhere. Throws Error with plain text messages for not
 * found or unauthorized conditions.
 *
 * @param props - Function input parameter object:
 *
 *   - Seller: Authenticated seller's JWT payload (includes the top-level user table
 *       id as payload.id)
 *   - ReviewId: UUID of the review to update
 *   - Body: Review patch body (IAiCommerceReview.IUpdate). Only seller_response is
 *       processed from this in seller endpoint.
 *
 * @returns The updated IAiCommerceReview object with all relevant fields as per
 *   schema.
 * @throws {Error} If the review does not exist, the seller does not own the
 *   product, or any relation in the chain is missing.
 */
export async function putaiCommerceSellerReviewsReviewId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceReview.IUpdate;
}): Promise<IAiCommerceReview> {
  // 1. Fetch review (must exist & not soft deleted)
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new Error("Review not found");
  }

  // 2. Fetch order item for review
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: review.order_item_id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new Error("Order item not found");
  }

  // 3. Fetch product variant for order item
  const productVariant =
    await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
      where: {
        id: orderItem.product_variant_id,
        deleted_at: null,
      },
    });
  if (!productVariant) {
    throw new Error("Product variant not found");
  }

  // 4. Fetch product for variant
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productVariant.product_id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // 5. Ensure current seller is actual owner
  if (product.seller_id !== props.seller.id) {
    throw new Error(
      "Forbidden: You do not have permission to respond to this review",
    );
  }

  // 6. Update only seller_response (never touch other fields for sellers)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_reviews.update({
    where: { id: props.reviewId },
    data: {
      seller_response: props.body.seller_response ?? undefined,
      updated_at: now,
    },
  });

  // 7. Return IAiCommerceReview DTO with proper field formatting and null/undefined mapping
  return {
    id: updated.id,
    author_id: updated.author_id,
    order_item_id: updated.order_item_id,
    rating: updated.rating,
    body: updated.body,
    seller_response: updated.seller_response ?? undefined,
    visibility: updated.visibility,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
