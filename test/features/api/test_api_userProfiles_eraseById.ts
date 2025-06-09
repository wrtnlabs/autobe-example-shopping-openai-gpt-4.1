import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IGenericDeleteResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IGenericDeleteResult";

export async function test_api_userProfiles_eraseById(
  connection: api.IConnection,
) {
  const output: IGenericDeleteResult =
    await api.functional.userProfiles.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
