import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminFavoriteInquiriesFavoriteInquiryId(props: {
  admin: AdminPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find (non-deleted) favorite inquiry by id
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

  // Step 2: Soft delete - set deleted_at to now
  await MyGlobal.prisma.shopping_mall_favorite_inquiries.update({
    where: { id: props.favoriteInquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
