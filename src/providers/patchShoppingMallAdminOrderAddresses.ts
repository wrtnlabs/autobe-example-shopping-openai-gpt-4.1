import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { IPageIShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrderAddresses(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderAddress.IRequest;
}): Promise<IPageIShoppingMallOrderAddress.ISummary> {
  const body = props.body;

  // Pagination
  const page = body.page != null ? body.page : 1;
  const limit = body.limit != null ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Sorting
  const sortField = body.sort_by === "updated_at" ? "updated_at" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build where conditions
  const where = {
    // region - partial case-insensitive match on address_main
    ...(body.region !== undefined &&
    body.region !== null &&
    body.region.length > 0
      ? {
          address_main: {
            contains: body.region,
          },
        }
      : {}),
    // postal_code -> zip_code exact match
    ...(body.postal_code !== undefined &&
    body.postal_code !== null &&
    body.postal_code.length > 0
      ? {
          zip_code: body.postal_code,
        }
      : {}),
    // search - fuzzy match on recipient_name, address_main, address_detail
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
      ? {
          OR: [
            { recipient_name: { contains: body.search } },
            { address_main: { contains: body.search } },
            { address_detail: { contains: body.search } },
          ],
        }
      : {}),
    // Exclude soft-deleted records
    deleted_at: null,
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_addresses.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_addresses.count({ where }),
  ]);

  const data = rows.map((addr) => ({
    id: addr.id,
    address_type: addr.address_type,
    recipient_name: addr.recipient_name,
    phone: addr.phone,
    zip_code: addr.zip_code,
    address_main: addr.address_main,
    address_detail: addr.address_detail ?? null,
    country_code: addr.country_code,
    created_at: toISOStringSafe(addr.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
