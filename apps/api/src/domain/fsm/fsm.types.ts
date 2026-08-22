import { FSMState } from "@prisma/client";

export { FSMState };

export interface TransitionResult {
  fromState: FSMState;
  toState: FSMState;
  success: boolean;
}
