import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageUserProfile";
import { IUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserProfile";

export async function test_api_userProfiles_patch(connection: api.IConnection) {
  const output: IPageUserProfile = await api.functional.userProfiles.patch(
    connection,
    {
      body: typia.random<IUserProfile.IRequest>(),
    },
  );
  typia.assert(output);
}
