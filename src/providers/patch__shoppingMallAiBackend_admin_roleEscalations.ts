import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";
import { IPageIShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendRoleEscalation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated and filtered list of all role escalation events (such
 * as promotions to seller or admin) within the system.
 *
 * This operation enumerates all role escalation snapshots or events within the
 * shopping_mall_ai_backend_role_escalations table, allowing advanced search and
 * filtering by role transition, escalation type, date, user, and admin.
 * Essential for governance, compliance reviews, and lifecycle auditing. Only
 * available to authenticated and active admin users.
 *
 * @param props - The request context and payload
 * @param props.admin - Authenticated admin user context (see AdminPayload
 *   definition)
 * @param props.body - Filter, pagination, and sorting request for escalation
 *   search (see IShoppingMallAiBackendRoleEscalation.IRequest)
 * @returns Paginated list result with escalation event summaries
 *   (IPageIShoppingMallAiBackendRoleEscalation.ISummary)
 * @throws {Error} If the admin context is missing or invalid (enforced by
 *   decorator and DB session validation).
 */
export async function patch__shoppingMallAiBackend_admin_roleEscalations(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendRoleEscalation.IRequest;
}): Promise<IPageIShoppingMallAiBackendRoleEscalation.ISummary> {
  const { admin, body } = props;

  // Compose Prisma where clause from filters (all fields present in schema)
  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
    ...(body.from_role !== undefined &&
      body.from_role !== null && { from_role: body.from_role }),
    ...(body.to_role !== undefined &&
      body.to_role !== null && { to_role: body.to_role }),
    ...(body.escalation_type !== undefined &&
      body.escalation_type !== null && {
        escalation_type: body.escalation_type,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Pagination defaults: page 1, size 20
  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (page - 1) * page_size;
  const take = page_size;

  // Sorting logic: sort="-field" (desc), "+field" (asc), default -created_at
  let orderBy: Record<string, "asc" | "desc">;
  if (typeof body.sort === "string" && body.sort.length > 0) {
    let field = body.sort;
    let direction: "asc" | "desc" = "asc";
    if (field.startsWith("-")) {
      field = field.slice(1);
      direction = "desc";
    } else if (field.startsWith("+")) {
      field = field.slice(1);
      direction = "asc";
    }
    orderBy = { [field]: direction };
  } else {
    orderBy = { created_at: "desc" };
  }

  // Run count and findMany (no intermediate variables)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_role_escalations.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_role_escalations.count({ where }),
  ]);

  // Structure and convert results per strict typing rules
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      admin_id: row.admin_id ?? null,
      from_role: row.from_role,
      to_role: row.to_role,
      escalation_type: row.escalation_type,
      reason: row.reason ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
