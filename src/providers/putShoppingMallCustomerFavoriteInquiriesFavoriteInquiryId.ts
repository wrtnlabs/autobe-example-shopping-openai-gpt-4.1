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

export async function putShoppingMallCustomerFavoriteInquiriesFavoriteInquiryId(props: {
  customer: CustomerPayload;
  favoriteInquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallFavoriteInquiry.IUpdate;
}): Promise<IShoppingMallFavoriteInquiry> {
  const now = toISOStringSafe(new Date());
  // 1. Find favorite inquiry (and enforce ownership & active status)
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_inquiries.findUnique({
      where: { id: props.favoriteInquiryId },
    });
  if (!favorite || favorite.deleted_at !== null) {
    throw new HttpException("Favorite inquiry not found", 404);
  }
  if (favorite.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have access to this favorite inquiry",
      403,
    );
  }

  // 2. Prepare update fields (only those provided in body)
  const updateData: {
    notification_enabled?: boolean;
    batch_label?: string | null;
    updated_at: string;
  } = {
    updated_at: now,
  };
  if (typeof props.body.notification_enabled === "boolean") {
    updateData.notification_enabled = props.body.notification_enabled;
  }
  if ("batch_label" in props.body) {
    updateData.batch_label = props.body.batch_label ?? null;
  }

  // 3. Update entity with passed-in fields
  const updated = await MyGlobal.prisma.shopping_mall_favorite_inquiries.update(
    {
      where: { id: props.favoriteInquiryId },
      data: updateData,
    },
  );

  // 4. Return with proper field format
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_product_inquiry_id: updated.shopping_mall_product_inquiry_id,
    shopping_mall_favorite_snapshot_id:
      updated.shopping_mall_favorite_snapshot_id,
    notification_enabled: updated.notification_enabled,
    batch_label:
      typeof updated.batch_label === "string"
        ? updated.batch_label
        : updated.batch_label === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
