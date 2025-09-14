import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import { IPageIAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve favorite addresses for the current seller
 * (ai_commerce_favorites_addresses).
 *
 * Fetches a paginated, filterable list of favorite addresses for the
 * authenticated seller/buyer user. Filters may include folder, label, primary
 * flag, address, and supports sorting/pagination per
 * IAiCommerceFavoritesAddress.IRequest. Only returns the calling seller's
 * favorites (enforced by user_id), and only active (non-soft-deleted) records.
 * Ensures all date fields are formatted as string & tags.Format<'date-time'>
 * with no native Date type used.
 *
 * @param props - Properties for the operation.
 * @param props.seller - Authenticated SellerPayload (ai_commerce_buyer.id,
 *   type: 'seller').
 * @param props.body - Filter and paging request following
 *   IAiCommerceFavoritesAddress.IRequest.
 * @returns Paginated summary view of the seller's favorite addresses.
 * @throws {Error} If the operation encounters a database error.
 */
export async function patchaiCommerceSellerFavoritesAddresses(props: {
  seller: SellerPayload;
  body: IAiCommerceFavoritesAddress.IRequest;
}): Promise<IPageIAiCommerceFavoritesAddress.ISummary> {
  const { seller, body } = props;
  const pageRaw = body.page !== undefined ? body.page : 1;
  const limitRaw = body.limit !== undefined ? body.limit : 20;
  // Remove brand tags from pagination for IPage.IPagination
  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  // Filtering clause for Prisma
  const where: Record<string, unknown> = {
    user_id: seller.id,
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

  // Sorting: default to created_at desc, allow label or created_at, direction asc/desc
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const [field, dir] = body.sort.trim().split(/|\s+/);
    if (
      (field === "created_at" || field === "label") &&
      (dir === "asc" || dir === "desc")
    ) {
      orderBy = { [field]: dir };
    }
  }

  // Query DB for page and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_addresses.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        user_id: true,
        address_id: true,
        snapshot_id: true,
        label: true,
        primary: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_favorites_addresses.count({ where }),
  ]);

  // Map result rows to summary type with correct date conversions
  const data: IAiCommerceFavoritesAddress.ISummary[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    address_id: row.address_id,
    snapshot_id: row.snapshot_id,
    label: row.label !== undefined ? row.label : null,
    primary: Boolean(row.primary),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  // Compose and return paginated result
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
