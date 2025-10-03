import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerFavoriteInquiriesFavoriteInquiryId(props: {
  customer: CustomerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the favorite inquiry by id, only if active (not deleted)
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_inquiries.findFirst({
      where: {
        id: props.favoriteInquiryId,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new HttpException(
      "Favorite inquiry not found or already deleted",
      404,
    );
  }
  // Ownership check (customer can only delete own favorite)
  if (favorite.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your favorite inquiry", 403);
  }
  // Soft delete: set deleted_at to current timestamp
  await MyGlobal.prisma.shopping_mall_favorite_inquiries.update({
    where: {
      id: props.favoriteInquiryId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
