import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import { IPageIShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductBundle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieves a paginated and filterable list of product bundles (SKU variants
 * grouping specific option units) for a given product.
 *
 * Searches the shopping_mall_ai_backend_product_bundles table for bundles
 * associated with the requested product, supporting search and pagination by
 * bundle attributes such as name, SKU, price, and activation status.
 * Authorization logic enforces that only bundles for an existing product may be
 * listed—ownership relationship via seller is not available in schema and thus
 * cannot be used for further restriction.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller
 * @param props.productId - ID of the parent product for which bundles
 *   (variants) should be listed
 * @param props.body - Search, filter, and pagination parameters for product
 *   bundles of a specific product
 * @returns Paginated list of simplified bundle information for product
 *   management workflows
 * @throws {Error} When the specified product does not exist
 */
export async function patch__shoppingMallAiBackend_seller_products_$productId_bundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductBundle.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductBundle.ISummary> {
  const { seller, productId, body } = props;
  // Schema limitation: cannot check seller ownership for product; can only check product existence
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
    });
  if (!product) throw new Error("Product does not exist");
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const where = {
    shopping_mall_ai_backend_products_id: productId,
    deleted_at: null,
    ...(body.search && {
      OR: [
        {
          bundle_name: { contains: body.search, mode: "insensitive" as const },
        },
        { sku_code: { contains: body.search, mode: "insensitive" as const } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findMany({
      where,
      orderBy: {
        created_at: body.sort_order === "asc" ? "asc" : "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.count({ where }),
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
      shopping_mall_ai_backend_products_id:
        row.shopping_mall_ai_backend_products_id,
      bundle_name: row.bundle_name,
      sku_code: row.sku_code,
      price: row.price,
      inventory_policy: row.inventory_policy,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
