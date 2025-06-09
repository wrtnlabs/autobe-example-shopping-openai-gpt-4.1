import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserProfile";

export async function test_api_userProfiles_getById(
  connection: api.IConnection,
) {
  const output: IUserProfile = await api.functional.userProfiles.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
