import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import { IPageIAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentGateway";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list payment gateway configurations in
 * ai_commerce_payment_gateways (admin-only).
 *
 * Administrators can retrieve a paginated, searchable list of payment gateway
 * definitions and configurations with complex filters for status, supported
 * currencies, display name, or region. The endpoint leverages JSON query and
 * full-text search on the ai_commerce_payment_gateways table, supporting
 * advanced administration and oversight of the payment gateway ecosystem.
 *
 * The search request body enables specifying multiple criteria, plus sorting
 * and pagination for efficiency when many gateway configurations exist. This
 * endpoint is restricted to admin users due to the sensitive nature of gateway
 * management (as changes may affect system payment flows). All query operations
 * are logged for security and traceability. The results include detailed
 * gateway configuration and status fields optimized for management UIs.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the search
 * @param props.body - Search/filter/sort/pagination criteria
 * @returns Paginated list of payment gateway configurations
 * @throws {Error} When an unexpected error occurs
 */
export async function patchaiCommerceAdminPaymentGateways(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentGateway.IRequest;
}): Promise<IPageIAiCommercePaymentGateway> {
  const { body } = props;

  // Pagination and limit, always integer-narrowed
  const page =
    typeof body.page === "number" && isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const limit =
    typeof body.limit === "number" && isFinite(body.limit) && body.limit > 0
      ? body.limit
      : 20;

  // Allowed sort fields (safeguard from arbitrary columns)
  const allowedSort = [
    "gateway_code",
    "display_name",
    "created_at",
    "updated_at",
  ];
  const sort = allowedSort.includes(body.sort ?? "")
    ? (body.sort as (typeof allowedSort)[number])
    : "created_at";
  const order: "asc" | "desc" =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Build where filter; skip deleted (soft delete)
  const where = {
    deleted_at: null,
    ...(body.gateway_code && { gateway_code: body.gateway_code }),
    ...(body.display_name && { display_name: { contains: body.display_name } }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...(body.supported_currency && {
      supported_currencies: { contains: body.supported_currency },
    }),
  };

  // Query paged results (always define inline for clarity)
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payment_gateways.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_payment_gateways.count({ where }),
  ]);

  // Map DB to API DTO, handle all date stringification/nullables/optionals
  const data = rows.map((gw) => ({
    id: gw.id,
    gateway_code: gw.gateway_code,
    display_name: gw.display_name,
    api_endpoint: gw.api_endpoint,
    is_active: gw.is_active,
    supported_currencies:
      gw.supported_currencies === null ? undefined : gw.supported_currencies,
    created_at: toISOStringSafe(gw.created_at),
    updated_at: toISOStringSafe(gw.updated_at),
    deleted_at: gw.deleted_at ? toISOStringSafe(gw.deleted_at) : undefined,
  }));
  const pages = Math.ceil(count / Number(limit));

  // Return in DTO structure, ensure strict conformance to null/undefined distinction
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages,
    },
    data,
  };
}
