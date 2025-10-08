import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";
import { IPageIShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAnalyticsTrigger";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAnalyticsTriggers(props: {
  admin: AdminPayload;
  body: IShoppingMallAnalyticsTrigger.IRequest;
}): Promise<IPageIShoppingMallAnalyticsTrigger.ISummary> {
  const { body } = props;

  // Only show not deleted
  const where = {
    deleted_at: null,
    ...(body.trigger_type ? { trigger_type: body.trigger_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.admin_id ? { shopping_mall_admin_id: body.admin_id } : {}),
    ...((body.created_from || body.created_to) && {
      created_at: {
        ...(body.created_from && { gte: body.created_from }),
        ...(body.created_to && { lte: body.created_to }),
      },
    }),
    ...(body.query && {
      OR: [
        { trigger_type: { contains: body.query } },
        { job_type: { contains: body.query } },
      ],
    }),
  };

  // Sorting (default: created_at desc)
  const allowedSortFields = ["created_at", "status", "trigger_type"];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortDir = body.sortDir === "asc" ? "asc" : "desc";

  // Pagination (defaults)
  const page = body.page && body.page > 0 ? body.page : 1;
  const pageSize = body.pageSize && body.pageSize > 0 ? body.pageSize : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_analytics_triggers.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_analytics_triggers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows,
  };
}
