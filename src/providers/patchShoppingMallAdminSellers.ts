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
  const body = props.body;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 && body.limit <= 200 ? body.limit : 100;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.shopping_mall_section_id !== undefined &&
      body.shopping_mall_section_id !== null && {
        shopping_mall_section_id: body.shopping_mall_section_id,
      }),
    ...(body.profile_name !== undefined &&
      body.profile_name !== null && {
        profile_name: { contains: body.profile_name },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.kyc_status !== undefined &&
      body.kyc_status !== null && {
        kyc_status: body.kyc_status,
      }),
    ...(body.approval_after !== undefined &&
      body.approval_after !== null && {
        approval_at: {
          ...(body.approval_after && { gte: body.approval_after }),
          ...(body.approval_before && { lte: body.approval_before }),
        },
      }),
    ...((body.approval_after === undefined || body.approval_after === null) &&
      body.approval_before !== undefined &&
      body.approval_before !== null && {
        approval_at: {
          ...(body.approval_before && { lte: body.approval_before }),
        },
      }),
    ...(body.created_after !== undefined &&
      body.created_after !== null && {
        created_at: {
          ...(body.created_after && { gte: body.created_after }),
          ...(body.created_before && { lte: body.created_before }),
        },
      }),
    ...((body.created_after === undefined || body.created_after === null) &&
      body.created_before !== undefined &&
      body.created_before !== null && {
        created_at: {
          ...(body.created_before && { lte: body.created_before }),
        },
      }),
    ...(body.deleted === true && { deleted_at: { not: null } }),
    ...(body.deleted === false && { deleted_at: null }),
  };

  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const match = /^([a-zA-Z0-9_]+)\s*(asc|desc)?$/i.exec(body.sort.trim());
    if (match) {
      const field = match[1];
      const dir = match[2] && match[2].toLowerCase() === "asc" ? "asc" : "desc";
      if (
        [
          "created_at",
          "profile_name",
          "status",
          "approval_at",
          "kyc_status",
          "updated_at",
        ].includes(field)
      ) {
        orderBy = { [field]: dir };
      }
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_section_id: true,
        profile_name: true,
        status: true,
        approval_at: true,
        kyc_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_section_id: row.shopping_mall_section_id,
      profile_name: row.profile_name,
      status: row.status,
      approval_at:
        row.approval_at === null || row.approval_at === undefined
          ? null
          : toISOStringSafe(row.approval_at),
      kyc_status: row.kyc_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null || row.deleted_at === undefined
          ? null
          : toISOStringSafe(row.deleted_at),
    })),
  };
}
