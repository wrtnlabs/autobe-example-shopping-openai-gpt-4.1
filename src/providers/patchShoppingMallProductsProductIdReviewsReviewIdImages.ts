import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

export async function patchShoppingMallProductsProductIdReviewsReviewIdImages(props: {
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallReviewImage> {
  const images = await MyGlobal.prisma.shopping_mall_review_images.findMany({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
    orderBy: { created_at: "asc" },
  });
  const resultImages = images.map((img) => ({
    id: img.id,
    shopping_mall_review_id: img.shopping_mall_review_id,
    image_uri: img.image_uri,
    created_at: toISOStringSafe(img.created_at),
  }));
  return {
    pagination: {
      current: Number(1),
      limit: Number(resultImages.length),
      records: Number(resultImages.length),
      pages: Number(1),
    },
    data: resultImages,
  };
}
