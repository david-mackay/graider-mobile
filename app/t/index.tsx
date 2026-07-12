import { Redirect } from "expo-router";

/** Web app uses /t; forward to the mobile teacher home. */
export default function TeacherWebAlias() {
  return <Redirect href="/(teacher)" />;
}
