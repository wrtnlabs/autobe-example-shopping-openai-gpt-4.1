import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

export async function getShoppingMallProductsProductIdReviewsReviewIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewImage> {
  const image = await MyGlobal.prisma.shopping_mall_review_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_review_id: props.reviewId,
      review: {
        shopping_mall_product_id: props.productId,
      },
    },
    select: {
      id: true,
      shopping_mall_review_id: true,
      image_uri: true,
      created_at: true,
    },
  });
  if (!image) {
    throw new HttpException("Review image not found", 404);
  }
  return {
    id: image.id,
    shopping_mall_review_id: image.shopping_mall_review_id,
    image_uri: image.image_uri,
    created_at: toISOStringSafe(image.created_at),
  };
}
