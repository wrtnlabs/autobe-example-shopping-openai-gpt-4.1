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

export async function putShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) throw new HttpException("Seller not found", 404);
  if (seller.deleted_at)
    throw new HttpException("Cannot update a deleted seller", 403);

  if (
    props.body.business_registration_number !== undefined &&
    props.body.business_registration_number !==
      seller.business_registration_number
  ) {
    const conflict = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: {
        business_registration_number: props.body.business_registration_number,
        id: { not: props.sellerId },
      },
    });
    if (conflict)
      throw new HttpException("Duplicate business_registration_number", 409);
  }

  const updated_at = toISOStringSafe(new Date());
  const data: Record<string, unknown> = {
    updated_at,
  };
  if (props.body.business_name !== undefined)
    data.business_name = props.body.business_name;
  if (props.body.contact_name !== undefined)
    data.contact_name = props.body.contact_name;
  if (props.body.phone !== undefined) data.phone = props.body.phone;
  if (props.body.kyc_document_uri !== undefined)
    data.kyc_document_uri = props.body.kyc_document_uri;
  if (props.body.approval_status !== undefined)
    data.approval_status = props.body.approval_status;
  if (props.body.business_registration_number !== undefined)
    data.business_registration_number = props.body.business_registration_number;
  if (props.body.email_verified !== undefined)
    data.email_verified = props.body.email_verified;
  if (props.body.deleted_at !== undefined)
    data.deleted_at = props.body.deleted_at;

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data,
  });

  return {
    id: updated.id,
    email: updated.email,
    business_name: updated.business_name,
    contact_name: updated.contact_name,
    phone: updated.phone,
    kyc_document_uri: updated.kyc_document_uri ?? undefined,
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
