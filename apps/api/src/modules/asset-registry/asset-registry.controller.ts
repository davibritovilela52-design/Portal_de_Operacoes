import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import {
  AssetRegistryApplicationService,
  CreateAssetCommand,
  CreateAssetCommandResult,
  ListAssetsCommand,
  ListAssetsCommandResult,
  UpdateAssetCommand,
  UpdateAssetCommandResult
} from './asset-registry-application.service.js';
import { PortalSessionService } from '../auth/portal-session.service.js';

@Controller('asset-registry')
export class AssetRegistryController {
  constructor(
    private readonly assetRegistryApplicationService: AssetRegistryApplicationService,
    private readonly portalSessionService: PortalSessionService
  ) {}

  @Get('catalog')
  getCatalog(): ReturnType<AssetRegistryApplicationService['getCatalog']> {
    return this.assetRegistryApplicationService.getCatalog();
  }

  @Post('assets')
  createAsset(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: CreateAssetCommand
  ): Promise<CreateAssetCommandResult> {
    return this.assetRegistryApplicationService.createAsset({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('assets/search')
  listAssets(
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: ListAssetsCommand
  ): Promise<ListAssetsCommandResult> {
    return this.assetRegistryApplicationService.listAssets({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken)
    });
  }

  @Post('assets/:assetId')
  updateAsset(
    @Param('assetId') assetId: string,
    @Headers('x-ops-portal-session') sessionToken: string | undefined,
    @Body() command: UpdateAssetCommand
  ): Promise<UpdateAssetCommandResult> {
    return this.assetRegistryApplicationService.updateAsset({
      ...command,
      actor: this.portalSessionService.resolveActor(command.actor, sessionToken),
      assetId
    });
  }
}
