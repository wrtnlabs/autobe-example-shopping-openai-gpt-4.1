import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const { seller, sellerId } = props;
  // Only the seller themselves can access this endpoint.
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Unauthorized: Sellers can only access their own data",
      403,
    );
  }

  // Retrieve seller's full account
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: sellerId,
      deleted_at: null,
    },
  });
  if (!sellerRecord) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: sellerRecord.id,
    email: sellerRecord.email,
    business_name: sellerRecord.business_name,
    contact_name: sellerRecord.contact_name,
    phone: sellerRecord.phone,
    kyc_document_uri: sellerRecord.kyc_document_uri ?? null,
    approval_status: sellerRecord.approval_status,
    business_registration_number: sellerRecord.business_registration_number,
    email_verified: sellerRecord.email_verified,
    created_at: toISOStringSafe(sellerRecord.created_at),
    updated_at: toISOStringSafe(sellerRecord.updated_at),
    deleted_at: sellerRecord.deleted_at
      ? toISOStringSafe(sellerRecord.deleted_at)
      : null,
  };
}
