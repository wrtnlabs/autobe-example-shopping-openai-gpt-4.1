import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerProductsProductIdReviewsReviewIdFlagsFlagId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.IUpdate;
}): Promise<IShoppingMallReviewFlag> {
  const { customer, productId, reviewId, flagId, body } = props;

  // Find the flag by id and matching review linkage
  const flag = await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
    where: {
      id: flagId,
      shopping_mall_review_id: reviewId,
    },
  });
  if (!flag) {
    throw new HttpException("Flag not found", 404);
  }

  // Check that review actually belongs to productId
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: reviewId,
      shopping_mall_product_id: productId,
    },
  });
  if (!review) {
    throw new HttpException("Flag not found", 404);
  }

  if (flag.status !== "open") {
    throw new HttpException("Cannot update a flag that is not open", 403);
  }

  if (flag.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "You do not have permission to update this flag",
      403,
    );
  }

  // Update note, status, updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_review_flags.update({
    where: { id: flagId },
    data: {
      note: "note" in body ? (body.note ?? null) : undefined,
      status: body.status,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_review_id: updated.shopping_mall_review_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    reason: updated.reason,
    note: updated.note ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
