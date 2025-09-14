import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { IPageIAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesAddress";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and retrieve favorite addresses for the current user
 * (ai_commerce_favorites_addresses).
 *
 * Fetches a paginated, filterable list of favorite addresses belonging to the
 * authenticated buyer. Enables searching, sorting, and advanced filtering
 * according to folder, label, or primary address using the criteria in
 * IAiCommerceFavoritesAddress.IRequest. Returns results as paginated summaries
 * following IPageIAiCommerceFavoritesAddress.ISummary structure.
 *
 * Authorization: Only authenticated buyers can retrieve their address
 * favorites. Results are always scoped to buyer.id and exclude soft-deleted
 * records. No access to other users' data.
 *
 * @param props - Object containing buyer identity and filter/sort/page criteria
 * @param props.buyer - The authenticated buyer (role: BuyerPayload)
 * @param props.body - Request body: filters, sort, and pagination
 *   (IAiCommerceFavoritesAddress.IRequest)
 * @returns Paginated list of favorite address summary records for the buyer
 */
export async function patchaiCommerceBuyerFavoritesAddresses(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesAddress.IRequest;
}): Promise<IPageIAiCommerceFavoritesAddress.ISummary> {
  const { buyer, body } = props;
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;

  // Dynamic where clause - only filter on provided fields
  const where = {
    user_id: buyer.id,
    deleted_at: null,
    ...(body.folder_id !== undefined &&
      body.folder_id !== null && { folder_id: body.folder_id }),
    ...(body.address_id !== undefined &&
      body.address_id !== null && { address_id: body.address_id }),
    ...(body.primary !== undefined &&
      body.primary !== null && { primary: body.primary }),
    ...(body.label !== undefined &&
      body.label !== null && { label: { contains: body.label } }),
  };

  // Parse sort: 'sort_field desc' or 'sort_field asc', default: created_at desc
  let orderBy: Record<string, "asc" | "desc">;
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [field, direction] = body.sort.split(/\s+/);
    orderBy = {
      [field]: direction && direction.toLowerCase() === "asc" ? "asc" : "desc",
    };
  } else {
    orderBy = { created_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_addresses.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_favorites_addresses.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      user_id: row.user_id,
      address_id: row.address_id,
      snapshot_id: row.snapshot_id,
      label: row.label ?? null,
      primary: row.primary,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
