import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  IProcessOperatorApplicationUseCase,
  ProcessOperatorApplicationInput,
  ProcessOperatorApplicationResult,
} from '../port/process-operator-application.usecase.interface';
import type { IOperatorApplicationRepository } from '../../domain/repository/operator-application.repository.interface';
import type { IOperatorRepository } from '../../domain/repository/operator.repository.interface';
import { Operator } from '../../domain/entity/operator.entity';
import { OperatorApplicationStatus } from '../../domain/value-object/operator-application-status.enum';

@Injectable()
export class ProcessOperatorApplicationUseCase implements IProcessOperatorApplicationUseCase {
  constructor(
    @Inject('IOperatorApplicationRepository')
    private readonly applicationRepo: IOperatorApplicationRepository,
    @Inject('IOperatorRepository')
    private readonly operatorRepo: IOperatorRepository,
  ) {}

  async execute(input: ProcessOperatorApplicationInput): Promise<ProcessOperatorApplicationResult> {
    const application = await this.applicationRepo.findById(input.applicationId);
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký nhà xe.');
    }

    let savedOperator: Operator | undefined = undefined;

    try {
      if (input.status === OperatorApplicationStatus.APPROVED) {
        // Phê duyệt đơn đăng ký & tạo mới Nhà xe chính thức
        application.approve();

        const operator = Operator.create({
          userId: application.userId,
          name: application.name,
        });

        savedOperator = await this.operatorRepo.save(operator);
      } else if (input.status === OperatorApplicationStatus.REJECTED) {
        // Từ chối đơn đăng ký kèm lý do
        if (!input.rejectReason) {
          throw new Error('Lý do từ chối không được để trống.');
        }
        application.reject(input.rejectReason);
      } else {
        throw new Error('Trạng thái xử lý không hợp lệ. Chỉ chấp nhận APPROVED hoặc REJECTED.');
      }
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    // Lưu trạng thái đơn đã xử lý vào CSDL
    const savedApplication = await this.applicationRepo.save(application);

    return {
      application: {
        id: savedApplication.id!,
        userId: savedApplication.userId,
        name: savedApplication.name,
        phone: savedApplication.phone.getValue(),
        address: savedApplication.address,
        status: savedApplication.status,
        rejectReason: savedApplication.rejectReason,
        createdAt: savedApplication.createdAt!,
        updatedAt: savedApplication.updatedAt!,
      },
      operator: savedOperator
        ? {
            id: savedOperator.id!,
            userId: savedOperator.userId,
            name: savedOperator.name,
            status: savedOperator.status,
            createdAt: savedOperator.createdAt!,
            updatedAt: savedOperator.updatedAt!,
          }
        : undefined,
    };
  }
}
