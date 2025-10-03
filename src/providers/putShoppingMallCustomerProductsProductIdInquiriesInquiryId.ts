import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerProductsProductIdInquiriesInquiryId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInquiry.IUpdate;
}): Promise<IShoppingMallProductInquiry> {
  const now = toISOStringSafe(new Date());

  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!inquiry) {
    throw new HttpException("Product inquiry not found", 404);
  }
  if (inquiry.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to update this inquiry",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: {
      title: props.body.title ?? undefined,
      body: props.body.body,
      is_private: props.body.is_private ?? undefined,
      moderation_status: props.body.moderation_status ?? undefined,
      answered: props.body.answered ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    title: typeof updated.title !== "undefined" ? updated.title : undefined,
    body: updated.body,
    is_private: updated.is_private,
    answered: updated.answered,
    moderation_status: updated.moderation_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
