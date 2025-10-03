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
  // Find existing seller (must exist and not be soft-deleted)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: props.sellerId, deleted_at: null },
  });
  if (!seller) {
    throw new HttpException("Seller not found or has been deleted", 404);
  }

  // Update only provided fields, set updated_at
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      profile_name: props.body.profile_name ?? undefined,
      status: props.body.status ?? undefined,
      approval_at:
        props.body.approval_at !== undefined
          ? props.body.approval_at
          : undefined,
      kyc_status: props.body.kyc_status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_section_id: updated.shopping_mall_section_id,
    profile_name: updated.profile_name,
    status: updated.status,
    approval_at: updated.approval_at
      ? toISOStringSafe(updated.approval_at)
      : null,
    kyc_status: updated.kyc_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
