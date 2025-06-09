import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserConsent";
import { IUserConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserConsent";

export async function test_api_userConsents_patch(connection: api.IConnection) {
  const output: IPageIUserConsent = await api.functional.userConsents.patch(
    connection,
    {
      body: typia.random<IUserConsent.IRequest>(),
    },
  );
  typia.assert(output);
}
