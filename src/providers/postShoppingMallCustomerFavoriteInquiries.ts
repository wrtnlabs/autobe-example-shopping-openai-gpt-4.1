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

export async function postShoppingMallCustomerFavoriteInquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteInquiry.ICreate;
}): Promise<IShoppingMallFavoriteInquiry> {
  const { customer, body } = props;

  // 1. Fetch inquiry, check existence and soft-deletion
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: body.shopping_mall_product_inquiry_id,
        deleted_at: null,
      },
    });
  if (!inquiry) {
    throw new HttpException("Inquiry not found or already deleted.", 404);
  }
  // 2. Check visibility—must be owner if private
  if (
    inquiry.is_private === true &&
    inquiry.shopping_mall_customer_id !== customer.id
  ) {
    throw new HttpException(
      "You do not have permission to favorite this inquiry.",
      403,
    );
  }
  // 3. Prevent duplicate favorite for this customer & inquiry (not soft-deleted)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_favorite_inquiries.findFirst({
      where: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_product_inquiry_id: body.shopping_mall_product_inquiry_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException("Already favorited.", 409);
  }
  // 4. Create snapshot of the inquiry's state at favoriting moment
  const snapshotId = v4();
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_favorite_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_product_inquiry_id: inquiry.id,
      entity_type: "inquiry",
      snapshot_data: JSON.stringify(inquiry),
      created_at: now,
      // All other fields not required for inquiry snapshots
    },
  });
  // 5. Create favorite record
  const favoriteId = v4();
  const created = await MyGlobal.prisma.shopping_mall_favorite_inquiries.create(
    {
      data: {
        id: favoriteId,
        shopping_mall_customer_id: customer.id,
        shopping_mall_product_inquiry_id: inquiry.id,
        shopping_mall_favorite_snapshot_id: snapshotId,
        notification_enabled:
          body.notification_enabled !== undefined
            ? body.notification_enabled
            : true,
        batch_label: body.batch_label !== undefined ? body.batch_label : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  // 6. Return DTO as per contract (remove null for undefined, relay all values as expected)
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_product_inquiry_id: created.shopping_mall_product_inquiry_id,
    shopping_mall_favorite_snapshot_id:
      created.shopping_mall_favorite_snapshot_id,
    notification_enabled: created.notification_enabled,
    batch_label: created.batch_label ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
