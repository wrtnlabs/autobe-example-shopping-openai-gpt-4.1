import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import { IPageIAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentMethod";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and filter all payment methods with full metadata from the
 * ai_commerce_payment_methods table.
 *
 * This endpoint allows admins to retrieve a paginated and filterable list of
 * supported payment methods from the ai_commerce_payment_methods table.
 * Returned data includes all metadata required for payment configuration,
 * analytics, and troubleshooting, with options to filter by status, method
 * code, display name, or date range. The implementation enforces authentication
 * and omits any soft-deleted records.
 *
 * @param props - Request parameters
 * @param props.admin - The authenticated admin making the request (enforced by
 *   decorator and revalidated for safety)
 * @param props.body - Search, filtering, and pagination options for payment
 *   method listing (see IAiCommercePaymentMethod.IRequest)
 * @returns Paginated list of payment methods with full metadata
 * @throws {Error} If the admin is not authenticated or is no longer active
 */
export async function patchaiCommerceAdminPaymentMethods(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentMethod.IRequest;
}): Promise<IPageIAiCommercePaymentMethod> {
  const { admin, body } = props;

  // Defensive check: ensure admin still exists and is active
  const adminRecord = await MyGlobal.prisma.ai_commerce_admin.findFirst({
    where: { id: admin.id, deleted_at: null, status: "active" },
  });
  if (!adminRecord) throw new Error("Not an active admin");

  // Pagination normalization
  let page = 1;
  let limit = 20;
  if (typeof body.page === "number" && body.page >= 1) {
    page = body.page;
  }
  if (typeof body.limit === "number" && body.limit >= 1) {
    limit = body.limit;
  }
  const skip = (page - 1) * limit;

  // Compose filtering options
  const where = {
    deleted_at: null,
    ...(typeof body.method_code === "string" &&
      body.method_code.length > 0 && { method_code: body.method_code }),
    ...(typeof body.display_name === "string" &&
      body.display_name.length > 0 && {
        display_name: { contains: body.display_name },
      }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.updated_at_from || body.updated_at_to
      ? {
          updated_at: {
            ...(body.updated_at_from && { gte: body.updated_at_from }),
            ...(body.updated_at_to && { lte: body.updated_at_to }),
          },
        }
      : {}),
  };

  // Determine safe sorting field and direction
  const allowedSort = [
    "created_at",
    "method_code",
    "display_name",
    "is_active",
    "updated_at",
  ];
  let sortBy = "created_at";
  if (body.sortBy && allowedSort.includes(body.sortBy)) sortBy = body.sortBy;
  let sortDir: "asc" | "desc" = body.sortDir === "asc" ? "asc" : "desc";

  // Fetch payment methods and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payment_methods.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_payment_methods.count({ where }),
  ]);

  // Map each result row to the strict DTO shape with correct types
  const data: IAiCommercePaymentMethod[] = rows.map((pm) => ({
    id: pm.id,
    method_code: pm.method_code,
    display_name: pm.display_name,
    is_active: pm.is_active,
    configuration:
      typeof pm.configuration === "string"
        ? pm.configuration
        : pm.configuration === null
          ? null
          : undefined,
    created_at: toISOStringSafe(pm.created_at),
    updated_at: toISOStringSafe(pm.updated_at),
    deleted_at:
      pm.deleted_at === null || typeof pm.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(pm.deleted_at),
  }));

  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
