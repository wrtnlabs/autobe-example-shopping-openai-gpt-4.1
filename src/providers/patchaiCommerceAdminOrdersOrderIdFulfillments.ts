import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { IPageIAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderFulfillments";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search fulfillment actions (ai_commerce_order_fulfillments) for an
 * order.
 *
 * Provides a paginated list and advanced search of all fulfillment actions
 * (ai_commerce_order_fulfillments) performed against a given order. Supports
 * filtering by sub-order, fulfillment status, carrier, and time. Enables
 * tracking of multi-step, split, or staged delivery in complex orders. Only
 * accessible to the order's buyer, relevant sellers or admins. Relies on
 * ai_commerce_order_fulfillments. Audit logs support compliance and support
 * scenarios.
 *
 * @param props - Properties for listing fulfillment actions
 * @param props.admin - The authenticated administrator making the request
 * @param props.orderId - Order ID (ai_commerce_orders.id) to retrieve
 *   fulfillments for
 * @param props.body - Advanced search and filtering parameters for fulfillments
 * @returns Paginated list of fulfillment events
 *   (IPageIAiCommerceOrderFulfillments)
 */
export async function patchaiCommerceAdminOrdersOrderIdFulfillments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderFulfillments.IRequest;
}): Promise<IPageIAiCommerceOrderFulfillments> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    order_id: props.orderId,
    ...(props.body.suborder_id !== undefined &&
      props.body.suborder_id !== null && {
        suborder_id: props.body.suborder_id,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.carrier !== undefined &&
      props.body.carrier !== null && {
        carrier: props.body.carrier,
      }),
    ...((props.body.from_date !== undefined && props.body.from_date !== null) ||
    (props.body.to_date !== undefined && props.body.to_date !== null)
      ? {
          fulfilled_at: {
            ...(props.body.from_date !== undefined &&
              props.body.from_date !== null && {
                gte: props.body.from_date,
              }),
            ...(props.body.to_date !== undefined &&
              props.body.to_date !== null && {
                lte: props.body.to_date,
              }),
          },
        }
      : {}),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.length > 0 && {
        fulfillment_code: {
          contains: props.body.search,
        },
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_fulfillments.findMany({
      where,
      orderBy: { fulfilled_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_fulfillments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: records.map((f) => ({
      id: f.id,
      order_id: f.order_id,
      suborder_id:
        f.suborder_id === null || f.suborder_id === undefined
          ? undefined
          : f.suborder_id,
      fulfillment_code: f.fulfillment_code,
      status: f.status,
      carrier: f.carrier,
      carrier_contact:
        f.carrier_contact === null || f.carrier_contact === undefined
          ? undefined
          : f.carrier_contact,
      fulfilled_at: toISOStringSafe(f.fulfilled_at),
      updated_at: toISOStringSafe(f.updated_at),
    })),
  };
}
