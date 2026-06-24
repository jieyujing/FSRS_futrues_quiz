/**
 * Returns true when the question type requires multi-select interaction.
 *
 * Matches question types containing '多选' (multi-select) or '综合' (comprehensive),
 * which are the two categories that allow selecting more than one option.
 */
export function isMultiChoice(questionType: string): boolean {
  return questionType.includes('多选') || questionType.includes('综合')
}
