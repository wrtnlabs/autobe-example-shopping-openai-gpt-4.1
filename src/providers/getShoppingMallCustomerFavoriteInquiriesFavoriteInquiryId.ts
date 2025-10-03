import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerFavoriteInquiriesFavoriteInquiryId(props: {
  customer: CustomerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteInquiry> {
  const record =
    await MyGlobal.prisma.shopping_mall_favorite_inquiries.findFirst({
      where: {
        id: props.favoriteInquiryId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException("Favorite inquiry not found", 404);
  }
  if (record.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only view your own favorite inquiries",
      403,
    );
  }
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    shopping_mall_product_inquiry_id: record.shopping_mall_product_inquiry_id,
    shopping_mall_favorite_snapshot_id:
      record.shopping_mall_favorite_snapshot_id,
    notification_enabled: record.notification_enabled,
    batch_label: record.batch_label ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
