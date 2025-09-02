import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search product inventories by product ID.
 *
 * Searches and lists all inventory records for a given product, with support
 * for filtering (inventory_status), sorting, and pagination. The endpoint
 * retrieves data from the shopping_mall_ai_backend_product_inventories table
 * and is scoped to a specific product. Returns paginated inventory results for
 * the product, enabling stock visibility and management for sellers/admins. May
 * support advanced queries for fulfillment, business analytics, or warehouse
 * management workflows.
 *
 * Requires valid admin authentication; only admin and privileged seller roles
 * may access this endpoint for reporting, adjustment, and analysis.
 *
 * @param props - Admin: Authenticated AdminPayload for admin access control.
 *   productId: UUID of the product whose inventories are listed. body: Filter,
 *   sort, and pagination options per
 *   IShoppingMallAiBackendProductInventory.IRequest.
 * @returns Paginated inventory records for the product as
 *   IPageIShoppingMallAiBackendProductInventory.
 * @throws {Error} If the associated product does not exist or if database
 *   errors occur.
 */
export async function patch__shoppingMallAiBackend_admin_products_$productId_inventories(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductInventory> {
  const { admin, productId, body } = props;

  // Defensive defaults for paging
  const page = body.page != null ? body.page : 1;
  const limit = body.limit != null ? body.limit : 20;

  // Order-by permit-list
  const allowedOrderFields = [
    "last_update_at",
    "available_quantity",
    "reserved_quantity",
    "inventory_status",
  ];
  const orderByField = allowedOrderFields.includes(body.order_by || "")
    ? body.order_by!
    : "last_update_at";
  const sortOrder = body.sort === "asc" ? "asc" : "desc";

  // WHERE building
  const where = {
    shopping_mall_ai_backend_products_id: productId,
    ...(body.inventory_status !== undefined &&
      body.inventory_status !== null && {
        inventory_status: body.inventory_status,
      }),
  };

  // Fetch inventory records (paginated) & total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.count({
      where,
    }),
  ]);

  // Map DB rows to DTO (converting date types)
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_products_id:
      row.shopping_mall_ai_backend_products_id,
    available_quantity: row.available_quantity,
    reserved_quantity: row.reserved_quantity,
    last_update_at: toISOStringSafe(row.last_update_at),
    inventory_status: row.inventory_status,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
