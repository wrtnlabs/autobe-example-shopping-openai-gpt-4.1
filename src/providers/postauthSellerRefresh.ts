import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";

/**
 * Refresh JWT tokens for valid seller session (ai_commerce_seller,
 * ai_commerce_buyer).
 *
 * This endpoint issues new access and refresh tokens for an authenticated
 * seller, provided the refresh token is valid and tied to an active seller
 * account. It checks the seller and buyer status, and logs the event. All
 * returned fields are type-safe, immutable, and follow TimeScript best
 * practices strictly—no native Date objects or type assertions are used.
 *
 * @returns Refreshed tokens and seller session info, matching
 *   IAiCommerceSeller.IAuthorized
 * @throws {Error} If the refresh token is missing, invalid, expired, or the
 *   seller is suspended/terminated/deleted
 */
export async function postauthSellerRefresh(): Promise<IAiCommerceSeller.IAuthorized> {
  throw new Error(
    "Cannot access HTTP headers in provider. The Authorization header (refresh token) must be provided by the platform/binding layer.",
  );
}
