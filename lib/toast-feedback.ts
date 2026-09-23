export function feedbackToastId(
  scope: "action" | "notification",
  title: string,
  description: string,
  type: string
) {
  return JSON.stringify(["feedback", scope, type, title, description])
}
