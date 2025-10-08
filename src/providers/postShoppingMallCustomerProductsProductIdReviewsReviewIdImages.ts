import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerProductsProductIdReviewsReviewIdImages(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewImage.ICreate;
}): Promise<IShoppingMallReviewImage> {
  const { customer, productId, reviewId, body } = props;

  // Step 1: Validate the review exists (correct product, author, not deleted, not rejected)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: reviewId,
      shopping_mall_product_id: productId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
      NOT: { status: "rejected" },
    },
  });
  if (!review) {
    throw new HttpException(
      "Review not found, unauthorized, deleted, or locked for image upload.",
      404,
    );
  }

  // Step 2: Count images
  const imageCount = await MyGlobal.prisma.shopping_mall_review_images.count({
    where: { shopping_mall_review_id: reviewId },
  });
  if (imageCount >= 5) {
    throw new HttpException(
      "Cannot upload more than 5 images per review.",
      400,
    );
  }

  // Step 3: Create new review image
  const now = toISOStringSafe(new Date());
  const imageId = v4() as string & tags.Format<"uuid">;
  const created = await MyGlobal.prisma.shopping_mall_review_images.create({
    data: {
      id: imageId,
      shopping_mall_review_id: reviewId,
      image_uri: body.image_uri,
      created_at: now,
    },
  });

  // Step 4: Return full DTO with strict types (cannot avoid single branding assertion for uuid)
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_review_id: created.shopping_mall_review_id as string &
      tags.Format<"uuid">,
    image_uri: created.image_uri,
    created_at: toISOStringSafe(created.created_at),
  };
}
