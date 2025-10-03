import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const {
    page = 1,
    limit = 20,
    status,
    kyc_status,
    email,
    name,
    created_from,
    created_to,
  } = props.body;

  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(status !== undefined && status !== null && status !== ""
      ? { status }
      : {}),
    ...(kyc_status !== undefined && kyc_status !== null && kyc_status !== ""
      ? { kyc_status }
      : {}),
    ...(email !== undefined && email !== null && email !== ""
      ? { email: { contains: email } }
      : {}),
    ...(name !== undefined && name !== null && name !== ""
      ? { name: { contains: name } }
      : {}),
    ...((created_from !== undefined && created_from !== null) ||
    (created_to !== undefined && created_to !== null)
      ? {
          created_at: {
            ...(created_from !== undefined &&
            created_from !== null &&
            created_from !== ""
              ? { gte: created_from }
              : {}),
            ...(created_to !== undefined &&
            created_to !== null &&
            created_to !== ""
              ? { lte: created_to }
              : {}),
          },
        }
      : {}),
  };

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: admins.map((admin) => {
      const summary = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        status: admin.status,
        kyc_status: admin.kyc_status,
        created_at: toISOStringSafe(admin.created_at),
        updated_at: toISOStringSafe(admin.updated_at),
      };
      return admin.deleted_at !== null && admin.deleted_at !== undefined
        ? { ...summary, deleted_at: toISOStringSafe(admin.deleted_at) }
        : summary;
    }),
  };
}
