import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserIdentityVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserIdentityVerification";

export async function test_api_userIdentityVerifications_post(
  connection: api.IConnection,
) {
  const output: IUserIdentityVerification =
    await api.functional.userIdentityVerifications.post(connection, {
      body: typia.random<IUserIdentityVerification.ICreate>(),
    });
  typia.assert(output);
}
