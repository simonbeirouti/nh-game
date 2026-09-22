export type ActionState<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

export const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
}

