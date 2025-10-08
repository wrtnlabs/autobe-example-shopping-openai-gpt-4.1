import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_name: seller.contact_name,
    phone: seller.phone,
    kyc_document_uri: seller.kyc_document_uri ?? undefined,
    approval_status: seller.approval_status,
    business_registration_number: seller.business_registration_number,
    email_verified: seller.email_verified,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at
      ? toISOStringSafe(seller.deleted_at)
      : undefined,
  };
}
