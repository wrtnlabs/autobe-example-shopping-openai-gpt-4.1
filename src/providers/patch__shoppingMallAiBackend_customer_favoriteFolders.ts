import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";
import { IPageIShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteFolder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a paginated, searchable list of a customer's favorite folders.
 *
 * Returns a paginated, filtered list of all favorite folders belonging to the
 * authenticated customer. Supports filtering by partial folder name, creation
 * date (from/to), and sorting by allowed fields. Only non-deleted folders are
 * returned. Pagination controls via page/limit.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer making the request
 * @param props.body - Folder search, filter, and pagination options
 * @returns Paginated summary of the customer's favorite folders for use in
 *   folder selection UIs, notification config, and organization workflows.
 * @throws {Error} When pagination parameters are invalid or sort field is
 *   disallowed.
 */
export async function patch__shoppingMallAiBackend_customer_favoriteFolders(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendFavoriteFolder.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavoriteFolder.ISummary> {
  const { customer, body } = props;

  // Extract and validate pagination controls
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (typeof page !== "number" || page < 1)
    throw new Error("page must be >= 1");
  if (typeof limit !== "number" || limit < 1)
    throw new Error("limit must be >= 1");

  // Compose WHERE conditions for Prisma
  const where = {
    shopping_mall_ai_backend_customer_id: customer.id,
    deleted_at: null,
    ...(body.name !== undefined && body.name !== null && body.name !== ""
      ? { name: { contains: body.name, mode: "insensitive" as const } }
      : {}),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // Allowed sort fields
  const allowedSort: readonly ["created_at", "name", "updated_at"] = [
    "created_at",
    "name",
    "updated_at",
  ];
  const sortField =
    body.sort !== undefined &&
    body.sort !== null &&
    allowedSort.includes(body.sort)
      ? body.sort
      : "created_at";
  const orderDir = body.order === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: orderDir };

  // Pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Fetch records and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
