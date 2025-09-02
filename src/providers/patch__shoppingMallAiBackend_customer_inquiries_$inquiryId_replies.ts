import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiryReply";
import { IPageIShoppingMallAiBackendInquiryReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendInquiryReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and paginate the list of replies for a specific inquiry.
 *
 * Retrieve a paginated response list (threaded replies, answers,
 * clarifications) for a given inquiry. Filters allow users to limit by author,
 * date, privacy setting, or response nesting (thread depth). Access is
 * determined by inquiry privacy and requester role (customer, seller, or
 * admin); users only receive replies to inquiries they own or are participants
 * in, while admins may access all for compliance and moderation.
 *
 * Results exclude deleted replies except for authorized compliance/admin roles.
 * The standard response also supports batch loading for moderation or evidence
 * views. Related endpoints include inquiry detail GET, create-reply, moderation
 * logs, and abuse reports.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.inquiryId - UUID of the inquiry to list replies for
 * @param props.body - Filter and pagination criteria for the replies
 * @returns Paginated list of inquiry replies matching filter/access control
 * @throws {Error} If any unexpected error occurs during retrieval
 */
export async function patch__shoppingMallAiBackend_customer_inquiries_$inquiryId_replies(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendInquiryReply.IRequest;
}): Promise<IPageIShoppingMallAiBackendInquiryReply.ISummary> {
  const { customer, inquiryId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const sortAllowed = ["created_at", "updated_at"];
  const sort =
    body.sort && sortAllowed.includes(body.sort) ? body.sort : "created_at";

  // Author type filter logic
  let authorFilter: object = {};
  if (body.author_type === "customer") {
    authorFilter = { customer_id: customer.id };
  } else if (body.author_type === "seller") {
    authorFilter = { seller_id: { not: null } };
  }
  // No admin_id in schema; cannot filter for admin replies

  // Date range filter
  let createdAtFilter: object = {};
  if (body.created_from || body.created_to) {
    createdAtFilter = {
      created_at: {
        ...(body.created_from ? { gte: body.created_from } : {}),
        ...(body.created_to ? { lte: body.created_to } : {}),
      },
    };
  }

  // Privacy filter: Only show private:true if authored by this customer
  const whereCondition = {
    inquiry_id: inquiryId,
    deleted_at: null,
    ...authorFilter,
    ...createdAtFilter,
    OR: [{ private: false }, { private: true, customer_id: customer.id }],
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.findMany({
      where: whereCondition,
      orderBy: { [sort]: "desc" as const },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_inquiry_replies.count({
      where: whereCondition,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    inquiry_id: row.inquiry_id,
    parent_id: row.parent_id ?? null,
    author_type:
      row.customer_id != null
        ? "customer"
        : row.seller_id != null
          ? "seller"
          : "admin", // Allowed for DTO but not supported by schema currently
    customer_id: row.customer_id ?? null,
    seller_id: row.seller_id ?? null,
    body: row.body,
    private: row.private,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

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
