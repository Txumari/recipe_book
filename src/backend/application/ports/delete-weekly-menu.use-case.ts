export interface DeleteWeeklyMenuUseCase {
  /** Throws MenuNotFoundError when the week has no menu. */
  execute(userId: string, weekStart: string): Promise<void>;
}
