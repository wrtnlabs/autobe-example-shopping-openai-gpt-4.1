import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdReviewsReviewIdFlagsFlagId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.IUpdate;
}): Promise<IShoppingMallReviewFlag> {
  // Fetch flag: must match id, reviewId, and seller ownership
  const flag = await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
    where: {
      id: props.flagId,
      shopping_mall_review_id: props.reviewId,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!flag) {
    throw new HttpException(
      "Review flag not found or not owned by seller",
      404,
    );
  }

  // Only allow update if status is 'open'
  if (flag.status !== "open") {
    throw new HttpException(
      "Flag cannot be updated (already resolved or rejected)",
      409,
    );
  }

  // Update flag (only note and status allowed; update updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_review_flags.update({
    where: { id: flag.id },
    data: {
      note: props.body.note ?? undefined,
      status: props.body.status,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_review_id: updated.shopping_mall_review_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    reason: updated.reason,
    note: updated.note ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
