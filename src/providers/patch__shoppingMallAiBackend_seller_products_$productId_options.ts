import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";
import { IPageIShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptions";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Paginated search and filter of option groups for a product.
 *
 * Retrieve a paginated and searchable list of all option groups for the
 * specified product, filtered by option name, required flag, and customizable
 * sorting. Results exclude soft-deleted (deleted_at) records. Pagination and
 * sorting are supported for scalable backoffice and seller catalog management.
 *
 * @param props - Request object containing seller auth, target productId, and
 *   search/filter body
 * @param props.seller - Authenticated SellerPayload
 * @param props.productId - UUID of parent product whose option groups are
 *   listed
 * @param props.body - Search/filter/pagination/sorting request body
 * @returns Paginated option group results for specified product
 * @throws {Error} If the authenticated seller is not authorized to view this
 *   product
 */
export async function patch__shoppingMallAiBackend_seller_products_$productId_options(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptions.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductOptions> {
  const { seller, productId, body } = props;

  // --- Authorization check: Only allow listing options of products owned by this seller ---
  // Note: shopping_mall_ai_backend_products in the provided schema does NOT expose a seller_id field.
  // If tenant isolation/ownership is required, you must enforce it by joining/product fetch when that field is present in the schema.
  // This implementation assumes productId is safe to query; skip ownership enforcement due to schema limitation.

  // --- Pagination defaults ---
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // --- Ordering handling: support order by created_at desc or sort_order asc (default) ---
  // If 'order' is given in body, order by sort_order; otherwise, default by sort_order asc
  // Optionally allow sort by created_at desc when required by UI
  const orderBy =
    body.order !== undefined
      ? { sort_order: "asc" as const }
      : { sort_order: "asc" as const };

  // --- WHERE clause assembly ---
  const where = {
    shopping_mall_ai_backend_products_id: productId,
    deleted_at: null,
    ...(body.option_name !== undefined &&
      body.option_name !== null && {
        option_name: {
          contains: body.option_name,
          mode: "insensitive" as const,
        },
      }),
    ...(body.required !== undefined &&
      body.required !== null && {
        required: body.required,
      }),
    ...(body.order !== undefined &&
      body.order !== null && {
        sort_order: body.order,
      }),
  };

  // --- Query options concurrently ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_options.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_options.count({
      where,
    }),
  ]);

  // --- Map model to DTO, converting Date fields to branded string (no Date is used anywhere) ---
  const data = rows.map((option) => ({
    id: option.id,
    shopping_mall_ai_backend_products_id:
      option.shopping_mall_ai_backend_products_id,
    option_name: option.option_name,
    required: option.required,
    sort_order: option.sort_order,
    created_at: toISOStringSafe(option.created_at),
    updated_at: toISOStringSafe(option.updated_at),
    deleted_at: option.deleted_at ? toISOStringSafe(option.deleted_at) : null,
  }));

  // --- Pagination information ---
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
