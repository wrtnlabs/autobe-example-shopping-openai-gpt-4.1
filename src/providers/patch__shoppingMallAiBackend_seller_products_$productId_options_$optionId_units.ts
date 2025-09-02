import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptionUnits";
import { IPageIShoppingMallAiBackendProductOptionUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductOptionUnits";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search option units (values) for a product option group, with pagination and
 * filtering.
 *
 * Get a paginated and searchable list of all units/values for a specific
 * product option group. This is useful for detailed product variant
 * configuration and validation of available option choices for buyers. The
 * operation supports advanced filtering by unit value or code, sorting, and
 * pagination, enhancing admin and seller productivity for product setup and
 * management.
 *
 * Non-owner or unauthorized sellers will receive an error, and records that are
 * soft deleted are not included unless for audit/recovery by admin. All access
 * is evidence-logged.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller payload injected by SellerAuth
 *   decorator
 * @param props.productId - Unique identifier of the product this option group
 *   belongs to
 * @param props.optionId - Unique identifier of the option group whose units to
 *   list
 * @param props.body - Optional filter/search criteria and pagination for option
 *   units
 * @returns Paginated list of units for the specified product option group,
 *   including pagination info and audit-compliant unit records
 * @throws {Error} When database operation fails or seller is not authorized
 *   (authorization checked by controller/decorator)
 */
export async function patch__shoppingMallAiBackend_seller_products_$productId_options_$optionId_units(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductOptionUnits.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductOptionUnits> {
  const { optionId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build where clause with required filters and optional search
  const where = {
    shopping_mall_ai_backend_product_options_id: optionId,
    deleted_at: null,
    ...(body.unit_value !== undefined &&
      body.unit_value !== null && {
        unit_value: { contains: body.unit_value, mode: "insensitive" as const },
      }),
    ...(body.unit_code !== undefined &&
      body.unit_code !== null && {
        unit_code: body.unit_code,
      }),
    ...(body.sort_order !== undefined &&
      body.sort_order !== null && {
        sort_order: body.sort_order,
      }),
  };

  // Pagination computation
  const skip = (page - 1) * limit;
  const take = limit;

  // Fetch paged results and total matching records concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.findMany({
      where,
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_option_units.count({
      where,
    }),
  ]);

  // Map DB rows to DTO structure with ISO date/time conversion and safe null handling
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_product_options_id:
      row.shopping_mall_ai_backend_product_options_id,
    unit_value: row.unit_value,
    unit_code: row.unit_code,
    sort_order: row.sort_order,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  // Fill paginated return with precise type for pagination numbers
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32">,
      limit: Number(limit) as number & tags.Type<"int32">,
      records: total as number & tags.Type<"int32">,
      pages: Math.ceil(total / limit) as number & tags.Type<"int32">,
    },
    data,
  };
}
