import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSettings";

/**
 * Validate the soft deletion of a platform setting as an admin.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin account (to get proper privileges)
 * 2. Create a new platform settings entry (with unique branding and URIs)
 * 3. Erase (soft delete) the new setting
 * 4. (Indirect) Validate deletion by attempting to erase again and expect error
 * 5. Attempt erase as unauthenticated/non-admin user and expect permission denial
 */
export async function test_api_platform_settings_admin_erase(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SuperSecure123!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new platform settings record
  const createBody = {
    site_title_ko: RandomGenerator.paragraph({ sentences: 2 }),
    site_title_en: RandomGenerator.paragraph({ sentences: 2 }),
    site_description_ko: RandomGenerator.paragraph({ sentences: 8 }),
    site_description_en: RandomGenerator.paragraph({ sentences: 8 }),
    support_email: adminEmail,
    support_phone: RandomGenerator.mobile(),
    branding_logo_uri:
      "https://cdn.example.com/" + RandomGenerator.alphaNumeric(10) + ".png",
    privacy_policy_uri:
      "https://example.com/privacy-" + RandomGenerator.alphaNumeric(5),
    terms_of_service_uri:
      "https://example.com/terms-" + RandomGenerator.alphaNumeric(5),
  } satisfies IShoppingMallPlatformSettings.ICreate;

  const setting: IShoppingMallPlatformSettings =
    await api.functional.shoppingMall.admin.platformSettings.create(
      connection,
      { body: createBody },
    );
  typia.assert(setting);

  // 3. Delete (soft erase) the platform setting
  await api.functional.shoppingMall.admin.platformSettings.erase(connection, {
    platformSettingId: setting.id,
  });

  // (No direct read/query, but can attempt to delete again and expect error)
  await TestValidator.error(
    "Deleting an already-deleted platform setting fails gracefully",
    async () => {
      // Try to delete again; expect fail
      await api.functional.shoppingMall.admin.platformSettings.erase(
        connection,
        {
          platformSettingId: setting.id,
        },
      );
    },
  );

  // 5. Attempt erase as unauthenticated/non-admin (simulate with new connection, no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Non-admin cannot erase platform setting",
    async () => {
      await api.functional.shoppingMall.admin.platformSettings.erase(
        unauthConn,
        {
          platformSettingId: setting.id,
        },
      );
    },
  );
}
