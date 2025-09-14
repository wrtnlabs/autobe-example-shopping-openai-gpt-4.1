import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesInquiries } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesInquiries";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new inquiry favorite and return the stored record (with snapshot and
 * folder if assigned).
 *
 * This operation allows an authenticated buyer to favorite a specific product
 * inquiry for rapid lookup, evidence retention (via immutable snapshot), and
 * notification personalization. Uniqueness is enforced per (user, inquiry) pair
 * — the user cannot favorite the same inquiry twice, and the inquiry must
 * exist. Automatically creates a snapshot of the inquiry's current state.
 * Handles folder/grouping and label annotation if provided, and returns the
 * final favorite record as stored.
 *
 * @param props - The input object containing authentication and request body.
 * @param props.buyer - Payload representing the authenticated buyer (role
 *   enforced by decorator).
 * @param props.body - The favorite inquiry creation input (must contain
 *   inquiry_id, and may include folder_id, label).
 * @returns The IAiCommerceFavoritesInquiries record for the created favorite
 *   inquiry.
 * @throws {Error} If the inquiry does not exist or the favorite already exists
 *   for this (user, inquiry) pair.
 */
export async function postaiCommerceBuyerFavoritesInquiries(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesInquiries.ICreate;
}): Promise<IAiCommerceFavoritesInquiries> {
  const { buyer, body } = props;

  // Step 1: Ensure inquiry exists (not soft-deleted)
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: {
      id: body.inquiry_id,
      deleted_at: null,
    },
  });
  if (inquiry === null) {
    throw new Error("Inquiry not found");
  }

  // Step 2: Enforce uniqueness (no duplicate favorite per user/inquiry)
  const existingFavorite =
    await MyGlobal.prisma.ai_commerce_favorites_inquiries.findFirst({
      where: {
        user_id: buyer.id,
        inquiry_id: body.inquiry_id,
        deleted_at: null,
      },
    });
  if (existingFavorite !== null) {
    throw new Error("You have already favorited this inquiry");
  }

  // Step 3: Prepare timestamps and IDs (all date strings, all UUIDs)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const favoriteId: string & tags.Format<"uuid"> = v4();
  const snapshotId: string & tags.Format<"uuid"> = v4();

  // Step 4: Create immutable snapshot of inquiry at favoriting moment
  await MyGlobal.prisma.ai_commerce_favorites_inquiry_snapshots.create({
    data: {
      id: snapshotId,
      inquiry_id: inquiry.id,
      question: inquiry.question,
      answer: inquiry.answer ?? null,
      status: inquiry.status,
      snapshot_date: now,
    },
  });

  // Step 5: Insert favorite inquiry record, with folder/label if present
  const created = await MyGlobal.prisma.ai_commerce_favorites_inquiries.create({
    data: {
      id: favoriteId,
      user_id: buyer.id,
      inquiry_id: inquiry.id,
      folder_id: body.folder_id ?? undefined,
      snapshot_id: snapshotId,
      label: body.label ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 6: Assemble result DTO, strictly matching type contract (no Date or as usage)
  return {
    id: created.id,
    user_id: created.user_id,
    inquiry_id: created.inquiry_id,
    folder_id:
      typeof created.folder_id === "undefined"
        ? undefined
        : created.folder_id === null
          ? null
          : created.folder_id,
    snapshot_id: created.snapshot_id,
    label:
      typeof created.label === "undefined"
        ? undefined
        : created.label === null
          ? null
          : created.label,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      typeof created.deleted_at === "undefined"
        ? undefined
        : created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
  };
}
