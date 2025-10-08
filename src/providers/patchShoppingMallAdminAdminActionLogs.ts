import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";
import { IPageIShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminActionLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminActionLog.IRequest;
}): Promise<IPageIShoppingMallAdminActionLog.ISummary> {
  const {
    action_type,
    affected_domain,
    affected_entity_id,
    acting_admin_id,
    created_at_from,
    created_at_to,
    page = 1,
    limit = 20,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  // Prepare filters for affected_entity_id (can match any affected_*_id)
  const affectedEntityOr =
    affected_entity_id !== undefined
      ? [
          { affected_customer_id: affected_entity_id },
          { affected_seller_id: affected_entity_id },
          { affected_product_id: affected_entity_id },
          { affected_order_id: affected_entity_id },
          { affected_review_id: affected_entity_id },
        ]
      : undefined;

  // Build Prisma where clause
  const where = {
    ...(action_type !== undefined && { action_type }),
    ...(affected_domain !== undefined && { domain: affected_domain }),
    ...(acting_admin_id !== undefined && {
      shopping_mall_admin_id: acting_admin_id,
    }),
    ...(created_at_from !== undefined && created_at_to !== undefined
      ? {
          created_at: {
            gte: created_at_from,
            lte: created_at_to,
          },
        }
      : created_at_from !== undefined
        ? {
            created_at: {
              gte: created_at_from,
            },
          }
        : created_at_to !== undefined
          ? {
              created_at: {
                lte: created_at_to,
              },
            }
          : {}),
    ...(affectedEntityOr !== undefined && { OR: affectedEntityOr }),
    deleted_at: null, // filter out soft-deleted logs
  };

  // Sorting
  const orderBy =
    sort_by === "action_type"
      ? { action_type: sort_order }
      : { created_at: sort_order };

  const skip = (page - 1) * limit;
  const take = limit;

  // Query data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_action_logs.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        action_type: true,
        action_reason: true,
        domain: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admin_action_logs.count({ where }),
  ]);

  // Map to ISummary type
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_admin_id: row.shopping_mall_admin_id,
    action_type: row.action_type,
    action_reason: row.action_reason,
    domain: row.domain,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination info
  const pages = Math.ceil(total / take);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
