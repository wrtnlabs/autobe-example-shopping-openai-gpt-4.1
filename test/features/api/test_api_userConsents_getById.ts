import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserConsent";

export async function test_api_userConsents_getById(
  connection: api.IConnection,
) {
  const output: IUserConsent = await api.functional.userConsents.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
