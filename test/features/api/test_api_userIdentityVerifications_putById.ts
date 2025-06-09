import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserIdentityVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserIdentityVerification";

export async function test_api_userIdentityVerifications_putById(
  connection: api.IConnection,
) {
  const output: IUserIdentityVerification =
    await api.functional.userIdentityVerifications.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserIdentityVerification.IUpdate>(),
    });
  typia.assert(output);
}
