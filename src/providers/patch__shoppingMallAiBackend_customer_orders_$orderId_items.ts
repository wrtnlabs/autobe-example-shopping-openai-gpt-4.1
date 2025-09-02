import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";
import { IPageIShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a paginated, filterable list of items within a specific order for
 * review or fulfillment.
 *
 * This endpoint retrieves order items belonging to a given order. It enforces
 * RBAC so only the purchasing customer can access their own order's items.
 * Supports advanced search, pagination, and filtering by product, status, and
 * creation/updated time. Uses soft-delete logic.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer making the request
 * @param props.orderId - Target order UUID
 * @param props.body - Filtering and pagination parameters
 * @returns Paginated list of order item summaries for the specified order
 * @throws {Error} If order is not found or does not belong to customer
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_items(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderItem.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderItem.ISummary> {
  const { customer, orderId, body } = props;
  // Authorization: verify order belongs to customer and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    },
  );
  if (!order) throw new Error("Order not found or access denied");

  // Build 'where' condition for items, supporting all filter fields
  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.product_id !== undefined &&
      body.product_id !== null && {
        shopping_mall_ai_backend_product_id: body.product_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: { gte: body.created_at },
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: { gte: body.updated_at },
      }),
  };

  const take = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * take;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_items.findMany({
      where,
      orderBy: { created_at: "desc" as const },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_items.count({ where }),
  ]);

  // Map Prisma results into ISummary objects for each item, ensuring date conversion
  const data = items.map((item) => ({
    id: item.id,
    order_id: item.shopping_mall_ai_backend_order_id,
    product_id: item.shopping_mall_ai_backend_product_id,
    product_title: item.product_title,
    quantity: item.quantity,
    final_amount: item.final_amount,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(take),
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
