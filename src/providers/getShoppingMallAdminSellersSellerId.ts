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
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller || seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  return {
    id: seller.id,
    shopping_mall_customer_id: seller.shopping_mall_customer_id,
    shopping_mall_section_id: seller.shopping_mall_section_id,
    profile_name: seller.profile_name,
    status: seller.status,
    approval_at: seller.approval_at
      ? toISOStringSafe(seller.approval_at)
      : null,
    kyc_status: seller.kyc_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at != null
        ? toISOStringSafe(seller.deleted_at)
        : undefined,
  };
}
