export const PROMPT_QUESTIONS_SEED = [
  {
    key: "currently_working_on",
    question: "What are you currently learning or working on?",
    order: 1,
  },
  {
    key: "talk_for_hours",
    question: "What could you talk about for hours?",
    order: 2,
  },
  {
    key: "unwind_activity",
    question: "What's your go-to when you want to unwind?",
    order: 3,
  },
  {
    key: "people_get_wrong",
    question: "What do you think people usually get wrong about you?",
    order: 4,
  },
  {
    key: "connect_easily_with",
    question: "What kind of person do you connect with easily?",
    order: 5,
  },
] as const;

/** Retired keys — kept inactive so existing answers stay valid. */
export const RETIRED_PROMPT_QUESTION_KEYS = ["what_excites_you"] as const;
