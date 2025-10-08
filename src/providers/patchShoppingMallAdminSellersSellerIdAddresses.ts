import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";
import { IPageIShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellersSellerIdAddresses(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerAddress.IRequest;
}): Promise<IPageIShoppingMallSellerAddress> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;
  // Ensure seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: props.sellerId },
  });
  if (!seller) throw new HttpException("Seller not found", 404);

  // Build where filter condition
  const where = {
    seller_id: props.sellerId,
    ...(props.body.type !== undefined ? { type: props.body.type } : {}),
    ...(props.body.region !== undefined
      ? { region: { contains: props.body.region } }
      : {}),
    ...(props.body.postal_code !== undefined
      ? { postal_code: { contains: props.body.postal_code } }
      : {}),
    ...(props.body.recipient_name !== undefined
      ? { recipient_name: { contains: props.body.recipient_name } }
      : {}),
    ...(props.body.is_primary !== undefined
      ? { is_primary: props.body.is_primary }
      : {}),
  };

  // Determine sorting
  const sortFields = [
    "created_at",
    "updated_at",
    "is_primary",
    "region",
    "type",
  ];
  let orderBy: any = { created_at: "desc" };
  if (props.body.sort_by && sortFields.includes(props.body.sort_by)) {
    orderBy = {
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    };
  }

  // Query for paged data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_addresses.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_seller_addresses.count({
      where,
    }),
  ]);

  // Map DB rows to API structure
  const addresses = rows.map((row) => ({
    id: row.id,
    seller_id: row.seller_id,
    type: typia.assert<"business" | "shipping" | "return">(row.type),
    recipient_name: row.recipient_name,
    phone: row.phone,
    region: row.region,
    postal_code: row.postal_code,
    address_line1: row.address_line1,
    address_line2: row.address_line2 ?? undefined,
    is_primary: row.is_primary,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: addresses,
  };
}
