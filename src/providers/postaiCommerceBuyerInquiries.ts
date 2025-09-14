import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new product inquiry (ai_commerce_inquiries table).
 *
 * Enables buyers to post a new inquiry about a product. This endpoint requires
 * authentication as a buyer, links the inquiry to the submitting buyer's
 * account, and initializes the inquiry with status='open' and optional
 * visibility (defaults to 'public'). Content is persisted to the
 * ai_commerce_inquiries table, with full tracking of creation timestamps and
 * immutable UUID.
 *
 * @param props - Object containing necessary parameters for inquiry creation
 * @param props.buyer - The authenticated buyer submitting the inquiry
 *   (BuyerPayload)
 * @param props.body - The inquiry details, including product_id (required),
 *   question (required), and optional visibility ('public'|'private' etc)
 * @returns The created inquiry object, matching IAiCommerceInquiry, complete
 *   with timestamps and identity fields
 * @throws {Error} When database insertion fails, or on any unhandled error
 */
export async function postaiCommerceBuyerInquiries(props: {
  buyer: BuyerPayload;
  body: IAiCommerceInquiry.ICreate;
}): Promise<IAiCommerceInquiry> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_inquiries.create({
    data: {
      id: v4(),
      author_id: props.buyer.id,
      product_id: props.body.product_id,
      question: props.body.question,
      visibility: props.body.visibility ?? "public",
      status: "open",
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    author_id: created.author_id,
    product_id: created.product_id,
    question: created.question,
    answer: created.answer ?? null,
    visibility: created.visibility,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
