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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdAddresses(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerAddress.IRequest;
}): Promise<IPageIShoppingMallSellerAddress> {
  const { seller, sellerId, body } = props;

  // Authorization: Only the owner seller can access
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: seller can only view their own addresses",
      403,
    );
  }

  // Pagination defaults
  const page =
    body.page ?? (1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    body.limit ??
    (20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>);
  if (limit > 100) {
    throw new HttpException("limit must be <= 100", 400);
  }

  // Building WHERE clause
  const where = {
    seller_id: sellerId,
    deleted_at: null,
    ...(body.type !== undefined && { type: body.type }),
    ...(body.region !== undefined &&
      body.region !== null &&
      body.region.length > 0 && {
        region: { contains: body.region },
      }),
    ...(body.postal_code !== undefined &&
      body.postal_code !== null &&
      body.postal_code.length > 0 && {
        postal_code: { contains: body.postal_code },
      }),
    ...(body.recipient_name !== undefined &&
      body.recipient_name !== null &&
      body.recipient_name.length > 0 && {
        recipient_name: { contains: body.recipient_name },
      }),
    ...(body.is_primary !== undefined &&
      body.is_primary !== null && { is_primary: body.is_primary }),
  };

  // Sorting
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "is_primary",
    "region",
    "type",
  ];
  const hasSortField =
    !!body.sort_by && allowedSortFields.includes(body.sort_by);
  const sort_by = hasSortField ? body.sort_by : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Query data and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_addresses.findMany({
      where,
      // Inline orderBy for proper type: must use allowed fields
      orderBy:
        sort_by === "created_at"
          ? { created_at: sort_order as Prisma.SortOrder }
          : sort_by === "updated_at"
            ? { updated_at: sort_order as Prisma.SortOrder }
            : sort_by === "is_primary"
              ? { is_primary: sort_order as Prisma.SortOrder }
              : sort_by === "region"
                ? { region: sort_order as Prisma.SortOrder }
                : sort_by === "type"
                  ? { type: sort_order as Prisma.SortOrder }
                  : { created_at: sort_order as Prisma.SortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_seller_addresses.count({ where }),
  ]);

  // Map to response DTO
  const data: IShoppingMallSellerAddress[] = rows.map((addr) => {
    return {
      id: addr.id,
      seller_id: addr.seller_id,
      type: typia.assert<"business" | "shipping" | "return">(
        addr.type as string,
      ),
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      region: addr.region,
      postal_code: addr.postal_code,
      address_line1: addr.address_line1,
      address_line2:
        addr.address_line2 !== null && addr.address_line2 !== undefined
          ? addr.address_line2
          : undefined,
      is_primary: addr.is_primary,
      created_at: toISOStringSafe(addr.created_at),
      updated_at: toISOStringSafe(addr.updated_at),
      ...(addr.deleted_at !== null &&
        addr.deleted_at !== undefined && {
          deleted_at: toISOStringSafe(addr.deleted_at),
        }),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (Number(limit) || 1)),
    },
    data,
  };
}
