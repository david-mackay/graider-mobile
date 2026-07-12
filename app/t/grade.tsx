import { Redirect } from "expo-router";

/** Web app uses /t/grade; forward to the mobile grade wizard. */
export default function TeacherGradeWebAlias() {
  return <Redirect href="/(teacher)/grade" />;
}
