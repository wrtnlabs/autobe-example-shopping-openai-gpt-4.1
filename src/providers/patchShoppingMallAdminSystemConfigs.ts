import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfig.IRequest;
}): Promise<IPageIShoppingMallSystemConfig> {
  const { body } = props;

  // Parse and sanitize pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit <= 0 ? 20 : limit > 100 ? 100 : limit;
  const skip = (safePage - 1) * safeLimit;

  // Build where clause for search filters (all as optional partial match except deleted_at)
  const where = {
    deleted_at: null,
    ...(body.config_key !== undefined &&
      body.config_key !== null && {
        config_key: { contains: body.config_key },
      }),
    ...(body.config_scope !== undefined &&
      body.config_scope !== null && {
        config_scope: { contains: body.config_scope },
      }),
    ...(body.value_type !== undefined &&
      body.value_type !== null && {
        value_type: { contains: body.value_type },
      }),
  };

  // Fetch data and total in parallel for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_configs.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.shopping_mall_system_configs.count({ where }),
  ]);

  // Transform DB rows to IShoppingMallSystemConfig DTOs
  const data = rows.map((row) => ({
    id: row.id,
    config_key: row.config_key,
    config_scope: row.config_scope,
    value_type: row.value_type,
    string_value: row.string_value ?? undefined,
    int_value: row.int_value ?? undefined,
    double_value: row.double_value ?? undefined,
    boolean_value: row.boolean_value ?? undefined,
    json_value: row.json_value ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data,
  };
}
