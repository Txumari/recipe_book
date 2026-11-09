import { Request, Response } from 'express';
import { SaveWeeklyMenuUseCase } from '../../application/ports/save-weekly-menu.use-case.ts';
import { GetWeeklyMenuUseCase } from '../../application/ports/get-weekly-menu.use-case.ts';
import { ListWeeklyMenusUseCase } from '../../application/ports/list-weekly-menus.use-case.ts';
import { DeleteWeeklyMenuUseCase } from '../../application/ports/delete-weekly-menu.use-case.ts';
import { MenuDomainError, MenuNotFoundError } from '../../domain/errors/menu-domain.error.ts';
import { resolveUserId } from './resolve-user-id.ts';

export class MenuController {
  constructor(
    private readonly saveWeeklyMenuService: SaveWeeklyMenuUseCase,
    private readonly getWeeklyMenuService: GetWeeklyMenuUseCase,
    private readonly listWeeklyMenusService: ListWeeklyMenusUseCase,
    private readonly deleteWeeklyMenuService: DeleteWeeklyMenuUseCase
  ) {}

  private handleError(res: Response, error: any): void {
    if (error instanceof MenuNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MenuDomainError) {
      // InvalidMenuPayloadError and UnknownMenuRecipeError
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error: ' + error?.message });
    }
  }

  public async listMenus(req: Request, res: Response): Promise<void> {
    try {
      const menus = await this.listWeeklyMenusService.execute(resolveUserId(req));
      res.status(200).json(menus);
    } catch (error: any) {
      this.handleError(res, error);
    }
  }

  public async getMenu(req: Request, res: Response): Promise<void> {
    try {
      const weekStart = req.params.weekStart;
      const menu = await this.getWeeklyMenuService.execute(resolveUserId(req), weekStart);
      if (!menu) {
        throw new MenuNotFoundError(weekStart);
      }
      res.status(200).json(menu);
    } catch (error: any) {
      this.handleError(res, error);
    }
  }

  public async putMenu(req: Request, res: Response): Promise<void> {
    try {
      const { menu, created } = await this.saveWeeklyMenuService.execute(
        resolveUserId(req),
        req.params.weekStart,
        req.body?.meals
      );
      res.status(created ? 201 : 200).json(menu);
    } catch (error: any) {
      this.handleError(res, error);
    }
  }

  public async deleteMenu(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteWeeklyMenuService.execute(resolveUserId(req), req.params.weekStart);
      res.status(204).send();
    } catch (error: any) {
      this.handleError(res, error);
    }
  }
}
