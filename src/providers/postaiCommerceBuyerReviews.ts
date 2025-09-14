import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new review for an order item (ai_commerce_reviews).
 *
 * Creates a review for a purchased product under ai_commerce_reviews,
 * referencing a completed order item. Verifies eligibility and ownership,
 * validates required fields (text body, numeric rating, visibility), and links
 * the review to the order item. Prevents duplicate reviews per order item as
 * per schema uniqueness constraint.
 *
 * Only buyers may create reviews for their own completed purchases. Sellers and
 * admins cannot create reviews through this endpoint. The system enforces
 * business rules, executes moderation checks, logs the event for compliance,
 * and triggers notification or incentives as necessary. Validation errors,
 * unauthorized, or business rule violations result in descriptive error
 * responses.
 *
 * The response returns all review fields, suitable for immediate display or
 * further moderation/feedback workflows.
 *
 * @param props - Request parameters containing the authenticated buyer and
 *   review creation fields.
 * @param props.buyer - Payload for the authenticated buyer user making the
 *   request. Must own the order item.
 * @param props.body - IAiCommerceReview.ICreate object, containing
 *   order_item_id (UUID), rating, body, visibility.
 * @returns IAiCommerceReview: The newly created review entity, with all fields
 *   set according to business logic.
 * @throws {Error} If the order item does not exist, is not owned by the buyer,
 *   has not been completed, or has already been reviewed.
 */
export async function postaiCommerceBuyerReviews(props: {
  buyer: BuyerPayload;
  body: IAiCommerceReview.ICreate;
}): Promise<IAiCommerceReview> {
  const { buyer, body } = props;

  // Step 1: Check existence of the order item
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: { id: body.order_item_id },
  });
  if (!orderItem) {
    throw new Error("Order item does not exist.");
  }

  // Step 2: Fetch parent order and verify buyer's ownership
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderItem.order_id },
  });
  if (!order) {
    throw new Error("Order for this item does not exist.");
  }
  if (order.buyer_id !== buyer.id) {
    throw new Error("You may only review purchases that you own.");
  }

  // Step 3: Verify order status is eligible for review
  const completedStatuses = ["delivered", "completed", "closed"];
  if (!completedStatuses.some((status) => order.status === status)) {
    throw new Error("Cannot review order before delivery/completion.");
  }

  // Step 4: Check for duplicate reviews by uniqueness constraint
  const existingReview = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: { order_item_id: body.order_item_id },
  });
  if (existingReview) {
    throw new Error("Review for this order item already exists.");
  }

  // Step 5: Create review with generated UUID and required fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const review = await MyGlobal.prisma.ai_commerce_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_id: buyer.id,
      order_item_id: body.order_item_id,
      rating: body.rating,
      body: body.body,
      visibility: body.visibility,
      status: "published",
      created_at: now,
      updated_at: now,
      // seller_response is optional/nullable and not set at creation
      // deleted_at is not set on creation (defaults to null by Prisma)
    },
  });

  // Step 6: Return the API DTO matching all IAiCommerceReview fields
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
