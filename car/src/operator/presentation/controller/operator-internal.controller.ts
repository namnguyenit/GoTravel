import { Body, Controller, Post } from '@nestjs/common';
import { Internal } from '../../../auth/internal.decorator';
import { OperatorProfileService } from '../../application/operator-profile.service';
import { ProvisionOperatorDto } from '../dto/provision-operator.dto';

@Controller('api/v1/internal/operators')
export class OperatorInternalController {
  constructor(private readonly profiles: OperatorProfileService) {}

  @Post('provision')
  @Internal(['identity'])
  async provision(@Body() dto: ProvisionOperatorDto) {
    const data = await this.profiles.provision(dto);
    return {
      success: true,
      code: 'OPERATOR_PROVISIONED',
      message: 'Đã đồng bộ nhà xe từ hồ sơ Identity',
      data,
    };
  }
}
