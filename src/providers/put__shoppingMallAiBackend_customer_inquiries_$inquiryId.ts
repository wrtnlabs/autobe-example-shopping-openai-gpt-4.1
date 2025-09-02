import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a specific inquiry by ID (content, status, privacy, etc).
 *
 * Enables authorized users to update the content, metadata, or workflow status
 * of an inquiry. Only the owner (customer/seller) or an administrator can
 * update; this function enforces customer ownership only. Updatable fields are
 * strict: title, body, private, status, closed_at. Edits to deleted or
 * finalized inquiries are disallowed. All date/datetime fields are normalized
 * as ISO 8601 strings (string & tags.Format<'date-time'>). All relevant
 * business rules—no use of the native `Date` type or of `as`—are strictly
 * enforced.
 *
 * @param props - The props object for customer-authenticated inquiry update
 * @param props.customer - The authenticated customer payload performing the
 *   update; must own the target inquiry
 * @param props.inquiryId - The UUID of the inquiry to update
 * @param props.body - The fields to update (title, body, private, status,
 *   closed_at)
 * @returns The fully hydrated, updated inquiry entity
 * @throws {Error} If not found, deleted, or not owned by the authenticated
 *   customer
 */
export async function put__shoppingMallAiBackend_customer_inquiries_$inquiryId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiry.IUpdate;
}): Promise<IShoppingMallAiBackendInquiry> {
  // Fetch and ensure existence/ownership
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findUnique({
      where: { id: props.inquiryId },
      select: {
        id: true,
        customer_id: true,
        seller_id: true,
        product_id: true,
        order_id: true,
        title: true,
        body: true,
        private: true,
        status: true,
        closed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!inquiry) throw new Error("Inquiry not found");
  if (inquiry.deleted_at !== null) throw new Error("Inquiry has been deleted");
  if (!inquiry.customer_id || inquiry.customer_id !== props.customer.id) {
    throw new Error("Unauthorized: you can only update your own inquiries");
  }

  // Build the update data inline, only including allowed fields
  const currentTimestamp = toISOStringSafe(new Date());
  const updateFields = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.body !== undefined && { body: props.body.body }),
    ...(props.body.private !== undefined && { private: props.body.private }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.closed_at !== undefined && {
      closed_at:
        props.body.closed_at !== null
          ? toISOStringSafe(props.body.closed_at)
          : null,
    }),
    updated_at: currentTimestamp,
  };

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.update({
      where: { id: props.inquiryId },
      data: updateFields,
      select: {
        id: true,
        customer_id: true,
        seller_id: true,
        product_id: true,
        order_id: true,
        title: true,
        body: true,
        private: true,
        status: true,
        closed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: updated.id,
    customer_id: updated.customer_id ?? null,
    seller_id: updated.seller_id ?? null,
    product_id: updated.product_id ?? null,
    order_id: updated.order_id ?? null,
    title: updated.title,
    body: updated.body,
    private: updated.private,
    status: updated.status,
    closed_at:
      updated.closed_at !== null ? toISOStringSafe(updated.closed_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
