import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const { body } = props;
  // Pagination (defaults)
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  // ORDER BY
  const allowedSortFields = ["created_at", "business_name", "approval_status"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // WHERE clause (exclude deleted_at)
  const where = {
    deleted_at: null,
    ...(body.business_name !== undefined &&
      body.business_name !== null &&
      body.business_name !== "" && {
        business_name: { contains: body.business_name },
      }),
    ...(body.email !== undefined &&
      body.email !== null &&
      body.email !== "" && {
        email: body.email,
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null &&
      body.approval_status !== "" && {
        approval_status: body.approval_status,
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        business_name: true,
        approval_status: true,
        contact_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((seller) => ({
      id: seller.id,
      email: seller.email,
      business_name: seller.business_name,
      approval_status: seller.approval_status,
      contact_name: seller.contact_name,
      created_at: toISOStringSafe(seller.created_at),
    })),
  };
}
