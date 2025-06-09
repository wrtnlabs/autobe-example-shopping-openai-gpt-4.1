import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserConsent";

export async function test_api_userConsents_post(connection: api.IConnection) {
  const output: IUserConsent = await api.functional.userConsents.post(
    connection,
    {
      body: typia.random<IUserConsent.ICreate>(),
    },
  );
  typia.assert(output);
}
