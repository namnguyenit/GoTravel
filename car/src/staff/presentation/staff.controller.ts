import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayMaxSize,
} from "class-validator";
import type { AuthenticatedRequest } from "../../auth/auth-user";
import { hasRole } from "../../auth/auth-user";
import { Internal } from "../../auth/internal.decorator";
import { StaffService } from "../application/staff.service";

export class AssignStaffDto {
  @IsBoolean() canSellCash: boolean;
  @IsBoolean() canCheckIn: boolean;
  @IsBoolean() active: boolean;
  @IsOptional() @IsBoolean() canManageTrip?: boolean;
  @IsOptional() @IsBoolean() canCloseShift?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  tripIds?: string[];
}

@Controller("operators/me/staff")
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get("lookup")
  async lookupStaff(
    @Query("query") query: string,
    @Req() request: AuthenticatedRequest
  ) {
    if (!hasRole(request.authUser!, "TICKET_VENDOR"))
      throw new ForbiddenException();
    if (!query?.trim())
      return {
        success: false,
        data: null,
        message: "Vui lòng cung cấp từ khóa tìm kiếm",
      };
    const found = await this.service.lookupStaff(
      request.authUser!.id,
      query.trim()
    );
    return {
      success: Boolean(found),
      data: found,
      message: found
        ? "Tìm thấy tài khoản nhân viên"
        : "Không tìm thấy tài khoản nhân viên phù hợp",
    };
  }

  @Get()
  async listStaff(@Req() request: AuthenticatedRequest) {
    if (!hasRole(request.authUser!, "TICKET_VENDOR"))
      throw new ForbiddenException();
    return {
      success: true,
      data: await this.service.listStaff(request.authUser!.id),
    };
  }

  @Put(":userId")
  async assign(
    @Param("userId") userParam: string,
    @Body() body: AssignStaffDto,
    @Req() request: AuthenticatedRequest
  ) {
    if (!hasRole(request.authUser!, "TICKET_VENDOR"))
      throw new ForbiddenException();

    let resolvedUserId = userParam.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        resolvedUserId
      );

    if (!isUuid) {
      const found = await this.service.lookupStaff(
        request.authUser!.id,
        resolvedUserId
      );
      if (!found) {
        throw new NotFoundException(
          `Không tìm thấy nhân viên phù hợp với thông tin '${userParam}'`
        );
      }
      resolvedUserId = found.id;
    }

    return this.service.assign(
      request.authUser!.id,
      resolvedUserId,
      body.canSellCash,
      body.canCheckIn,
      body.active,
      {
        canManageTrip: body.canManageTrip,
        canCloseShift: body.canCloseShift,
        tripIds: body.tripIds,
      }
    );
  }
}

@Controller("staff/me")
export class StaffMeController {
  constructor(private readonly service: StaffService) {}

  @Get("assignments")
  async getAssignments(@Req() request: AuthenticatedRequest) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new ForbiddenException("Chưa đăng nhập");
    }
    return {
      success: true,
      data: await this.service.getAssignmentsForStaff(userId),
    };
  }

  @Get("trips")
  async getAssignedTrips(@Req() request: AuthenticatedRequest) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new ForbiddenException("Chưa đăng nhập");
    }
    return {
      success: true,
      data: await this.service.getAssignedTripsForStaff(userId),
    };
  }
}

@Controller("api/v1/internal/car/staff")
export class StaffInternalController {
  constructor(private readonly service: StaffService) {}

  @Get("read-scope")
  @Internal()
  async getReadScope(
    @Query("actorId", new ParseUUIDPipe()) actorId: string,
    @Query("operatorId") operatorId?: string
  ) {
    return {
      success: true,
      data: await this.service.getReadScope(actorId, operatorId),
    };
  }

  @Get("authorize-operator")
  @Internal()
  async authorizeOperator(
    @Query("actorId", new ParseUUIDPipe()) actorId: string,
    @Query("operatorId", new ParseUUIDPipe()) operatorId: string
  ) {
    return {
      success: true,
      data: await this.service.verifyOperator(
        actorId,
        operatorId,
        "CLOSE_SHIFT"
      ),
    };
  }

  @Get("authorize")
  @Internal()
  async authorize(
    @Query("actorId", new ParseUUIDPipe()) actorId: string,
    @Query("tripId", new ParseUUIDPipe()) tripId: string,
    @Query("capability") capability: string
  ) {
    if (
      !["SELL_CASH", "CHECK_IN", "MANAGE_TRIP", "CLOSE_SHIFT"].includes(
        capability
      )
    ) {
      throw new ForbiddenException("Quyền không hợp lệ");
    }
    return {
      success: true,
      data: await this.service.verify(
        actorId,
        tripId,
        capability as import("../domain/staff.repository").StaffCapability
      ),
    };
  }
}
