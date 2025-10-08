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

export async function putShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const { seller, sellerId, body } = props;
  // Ownership enforcement: only self-update allowed
  if (seller.id !== sellerId) {
    throw new HttpException(
      "You can only update your own seller account.",
      403,
    );
  }
  // Admin-only fields: approval_status, deleted_at, email_verified (cannot update as seller role)
  if (
    body.approval_status !== undefined ||
    body.deleted_at !== undefined ||
    body.email_verified !== undefined
  ) {
    throw new HttpException(
      "approval_status, deleted_at, or email_verified can only be changed by an admin.",
      403,
    );
  }
  // Fetch seller, enforce not deleted
  const current = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: sellerId, deleted_at: null },
  });
  if (!current) {
    throw new HttpException("Seller not found", 404);
  }
  // Prepare updates object, ignore forbidden fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: sellerId },
    data: {
      business_name:
        body.business_name !== undefined ? body.business_name : undefined,
      contact_name:
        body.contact_name !== undefined ? body.contact_name : undefined,
      phone: body.phone !== undefined ? body.phone : undefined,
      kyc_document_uri:
        body.kyc_document_uri !== undefined ? body.kyc_document_uri : undefined,
      business_registration_number:
        body.business_registration_number !== undefined
          ? body.business_registration_number
          : undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    email: updated.email,
    business_name: updated.business_name,
    contact_name: updated.contact_name,
    phone: updated.phone,
    kyc_document_uri: updated.kyc_document_uri ?? null,
    approval_status: updated.approval_status,
    business_registration_number: updated.business_registration_number,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
