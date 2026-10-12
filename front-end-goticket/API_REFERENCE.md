# API_REFERENCE — đối chiếu trực tiếp controller source ngày 11/10/2026

Đọc cùng FRONTEND_GOTICKET_PLAN.md. Đây là inventory source của GoCar và các controller liên quan trong Cart/Identity/Catalog/GoPay/Inventory; controller dùng chung có cả chức năng GoTravel ngoài phạm vi GoTicket. **Không có nghĩa tất cả endpoint này đều cần hiển thị trong GoTicket.** Các endpoint host/stay/enterprise cũ chỉ để nhận diện contract dùng chung, không dùng để giả danh quyền TICKET_VENDOR.

`Backend` = path trên service; `Browser` = alias suy ra từ seed config Gateway. Registry đang chạy có thể khác seed và chưa được kiểm tra trong đợt tài liệu này. Role trong bảng là decorator/controller; scope owner/staff/current-trip/live-account còn được kiểm trong service. Backend chưa generate/build/test/migrate; số endpoint là số khai báo source, không phải số API đã hoạt động.

UUID: `{id}` và `:id` là cùng ý nghĩa; thay bằng UUID thật. Không gửi X-User-Id hay internal secret từ browser. Signature Java/TypeScript ghi chính xác query/header/body/response type; DTO_REFERENCE giữ schema và validators tham khảo. Response Map/record inline đọc source chỉ rõ trong kế hoạch.

## Gateway session và GoPay portal (Node)

| Method | Path | Input / kết quả |
|---|---|---|
| GET | `/api/v1/auth/session` | cookie session → authenticated/userId/roles/expiresAt; 401 guest |
| POST | `/api/v1/auth/login` | Auth UI dùng credential DTO Identity; Gateway tạo HttpOnly cookie, không trả token cho GoTicket |
| POST | `/api/v1/auth/refresh-roles` | cookie + CSRF; refresh role claims sau duyệt vendor |
| POST | `/api/v1/auth/logout` | cookie + CSRF; clear session |
| POST | `{PAY_ORIGIN}/launch` | `{orderId}` + credentials; allowlisted Origin; `{url:'/pay?session=...'}`. **Hiện chỉ GoTravel order launch, cần mở rộng GoTicket.** |
| GET | `{PAY_ORIGIN}/session?ticket=...` | Portal đọc launch session bound cookie; GoTicket không giả ticket |

GoPay portal `/pay` cần launch hợp lệ, truy cập không có session trả trang không tồn tại. Giữ behavior này khi mở rộng. Provider IPN/webhook là server callback; không dùng route đó từ trình duyệt để đánh dấu paid.

## Số khai báo source trong inventory

car: 68, cart: 75, catalog: 27, identity: 47, inventory: 12, payment: 31. Tổng: 260 (bao gồm internal/callback và endpoint dùng chung ngoài GoTicket).

## car

### CAR-001: GET `/`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: authenticated + application scope
- Source: [app.controller.ts](/home/DoANLienNganh/car/src/app.controller.ts:8) — method `getHello`.

```typescript
@Get()
  getHello(): string
```

### CAR-002: GET `/api/v1/internal/car/staff/authorize`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:139) — method `authorize`.

```typescript
@Get('authorize')
  @Internal()
  async authorize(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('tripId', new ParseUUIDPipe()) tripId: string,
    @Query('capability') capability: string,
  )
```

### CAR-003: GET `/api/v1/internal/car/staff/authorize-operator`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:123) — method `authorizeOperator`.

```typescript
@Get('authorize-operator')
  @Internal()
  async authorizeOperator(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('operatorId', new ParseUUIDPipe()) operatorId: string,
  )
```

### CAR-004: GET `/api/v1/internal/car/staff/read-scope`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:111) — method `getReadScope`.

```typescript
@Get('read-scope')
  @Internal()
  async getReadScope(
    @Query('actorId', new ParseUUIDPipe()) actorId: string,
    @Query('operatorId') operatorId?: string,
  )
```

### CAR-005: PUT `/api/v1/internal/car/transport/item-operations/:id/abort`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [item-ticket.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/item-ticket.controller.ts:17) — method `abort`.

```typescript
@Put(':id/abort') @Internal() async abort(
    @Param('id', new ParseUUIDPipe()) id: string,
  )
```

### CAR-006: PUT `/api/v1/internal/car/transport/item-operations/:id/commit`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [item-ticket.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/item-ticket.controller.ts:12) — method `commit`.

```typescript
@Put(':id/commit') @Internal() async commit(
    @Param('id', new ParseUUIDPipe()) id: string,
  )
```

### CAR-007: PUT `/api/v1/internal/car/transport/item-operations/:id/prepare`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [item-ticket.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/item-ticket.controller.ts:7) — method `prepare`.

```typescript
@Put(':id/prepare') @Internal() async prepare(
    @Param('id', new ParseUUIDPipe()) id: string,
  )
```

### CAR-008: GET `/api/v1/internal/car/transport/orders/:orderId/tickets`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:123) — method `orderTickets`.

```typescript
@Get('orders/:orderId/tickets')
  @Internal()
  async orderTickets(@Param('orderId', new ParseUUIDPipe()) orderId: string)
```

### CAR-009: POST `/api/v1/internal/car/transport/quote`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:141) — method `quote`.

```typescript
@Post('quote')
  @Internal()
  async quote(@Body() body: QuoteRequestDto)
```

### CAR-010: POST `/api/v1/internal/car/transport/quotes/:quoteId/claim`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:129) — method `claimQuote`.

```typescript
@Post('quotes/:quoteId/claim')
  @Internal()
  async claimQuote(
    @Param('quoteId', new ParseUUIDPipe()) quoteId: string,
    @Body() dto: ClaimQuoteDto,
  )
```

### CAR-011: POST `/api/v1/internal/car/transport/tickets`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:150) — method `issueTickets`.

```typescript
@Post('tickets')
  @Internal()
  async issueTickets(@Body() body: IssueTicketsDto)
```

### CAR-012: POST `/api/v1/internal/car/transport/tickets/amend`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:174) — method `amendTicket`.

```typescript
@Post('tickets/amend')
  @Internal()
  async amendTicket(@Body() body: AmendTicketDto)
```

### CAR-013: POST `/api/v1/internal/car/transport/tickets/void-order/:orderId`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:168) — method `voidTickets`.

```typescript
@Post('tickets/void-order/:orderId')
  @Internal()
  async voidTickets(@Param('orderId', new ParseUUIDPipe()) orderId: string)
```

### CAR-014: GET `/api/v1/internal/car/transport/trips/:tripId/state`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:119) — method `tripState`.

```typescript
@Get('trips/:tripId/state')
  @Internal()
  async tripState(@Param('tripId', new ParseUUIDPipe()) tripId: string)
```

### CAR-015: GET `/cars`

- Browser: `/api/v1/cars`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [car.controller.ts](/home/DoANLienNganh/car/src/car/presentation/controller/car.controller.ts:57) — method `getCars`.

```typescript
@Get()
  async getCars(
    @Query() query: GetCarsQueryDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-016: POST `/cars`

- Browser: `/api/v1/cars`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [car.controller.ts](/home/DoANLienNganh/car/src/car/presentation/controller/car.controller.ts:42) — method `addCar`.

```typescript
@Post()
  async addCar(
    @Body() dto: CreateCarDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-017: PUT `/cars/:carId/seats`

- Browser: `/api/v1/cars/:carId/seats`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:43) — method `replaceSeatTemplate`.

```typescript
@Put('cars/:carId/seats')
  replaceSeatTemplate(
    @Param('carId', new ParseUUIDPipe()) carId: string,
    @Body() body: ReplaceSeatsDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-018: GET `/cars/:id`

- Browser: `/api/v1/cars/:id`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [car.controller.ts](/home/DoANLienNganh/car/src/car/presentation/controller/car.controller.ts:72) — method `getCarDetail`.

```typescript
@Get(':id')
  async getCarDetail(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-019: PATCH `/cars/:id`

- Browser: `/api/v1/cars/:id`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [car.controller.ts](/home/DoANLienNganh/car/src/car/presentation/controller/car.controller.ts:86) — method `updateCar`.

```typescript
@Patch(':id')
  async updateCar(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Body() dto: UpdateCarDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-020: PATCH `/cars/:id/status`

- Browser: `/api/v1/cars/:id/status`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [car.controller.ts](/home/DoANLienNganh/car/src/car/presentation/controller/car.controller.ts:104) — method `updateCarStatus`.

```typescript
@Patch(':id/status')
  async updateCarStatus(
    @Param('id', new ParseUUIDPipe()) carId: string,
    @Body() dto: UpdateCarStatusDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-021: GET `/me`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: authenticated + application scope
- Source: [app.controller.ts](/home/DoANLienNganh/car/src/app.controller.ts:13) — method `getMe`.

```typescript
@Get("me")
  async getMe(@Headers('authorization') authHeader?: string)
```

### CAR-022: GET `/operator-applications`

- Browser: `/api/v1/operator-applications`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:72) — method `getApplications`.

```typescript
@Get()
  async getApplications(
    @Query('status') status?: OperatorApplicationStatus,
    @Req() request?: AuthenticatedRequest,
  )
```

### CAR-023: POST `/operator-applications`

- Browser: `/api/v1/operator-applications`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:59) — method `requestOperator`.

```typescript
@Post()
  async requestOperator(
    @Body() dto: CreateOperatorApplicationDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-024: PATCH `/operator-applications/:id/approve`

- Browser: `/api/v1/operator-applications/:id/approve`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:105) — method `approveApplication`.

```typescript
@Patch(':id/approve')
  async approveApplication(
    @Param('id') id: string,
    @Req() request?: AuthenticatedRequest,
  )
```

### CAR-025: PATCH `/operator-applications/:id/process`

- Browser: `/api/v1/operator-applications/:id/process`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:86) — method `processApplication`.

```typescript
@Patch(':id/process')
  async processApplication(
    @Param('id') id: string,
    @Body() dto: ProcessOperatorApplicationDto,
    @Req() request?: AuthenticatedRequest,
  )
```

### CAR-026: PATCH `/operator-applications/:id/reject`

- Browser: `/api/v1/operator-applications/:id/reject`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:122) — method `rejectApplication`.

```typescript
@Patch(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body('rejectReason') rejectReason?: string,
    @Body('reason') reason?: string,
    @Req() request?: AuthenticatedRequest,
  )
```

### CAR-027: GET `/operator-applications/me`

- Browser: `/api/v1/operator-applications/me`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-application.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator-application.controller.ts:48) — method `getMyStatus`.

```typescript
@Get('me')
  async getMyStatus(
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-028: GET `/operators`

- Browser: `/api/v1/operators`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator.controller.ts:112) — method `getOperators`.

```typescript
@Get()
  async getOperators(
    @Query() query: GetOperatorsQueryDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-029: GET `/operators/:operatorId/profile`

- Browser: `/api/v1/operators/:operatorId/profile`
- Controller authorization: public
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator.controller.ts:126) — method `getPublicProfile`.

```typescript
@Get(':operatorId/profile')
  @Public()
  async getPublicProfile(
    @Param('operatorId', new ParseUUIDPipe()) operatorId: string,
  )
```

### CAR-030: PATCH `/operators/:operatorId/status`

- Browser: `/api/v1/operators/:operatorId/status`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator.controller.ts:86) — method `updateOperatorStatus`.

```typescript
@Patch(':operatorId/status')
  async updateOperatorStatus(
    @Param('operatorId', new ParseUUIDPipe()) operatorId: string,
    @Body() dto: UpdateOperatorStatusDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-031: GET `/operators/me/profile`

- Browser: `/api/v1/operators/me/profile`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator.controller.ts:42) — method `getMyProfile`.

```typescript
@Get('me/profile')
  async getMyProfile(@Req() request: AuthenticatedRequest)
```

### CAR-032: PATCH `/operators/me/profile`

- Browser: `/api/v1/operators/me/profile`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator.controller.ts](/home/DoANLienNganh/car/src/operator/presentation/controller/operator.controller.ts:61) — method `updateMyProfile`.

```typescript
@Patch('me/profile')
  async updateMyProfile(
    @Body() dto: UpdateOperatorProfileDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-033: GET `/operators/me/staff`

- Browser: `/api/v1/operators/me/staff`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:41) — method `listStaff`.

```typescript
@Get()
  async listStaff(@Req() request: AuthenticatedRequest)
```

### CAR-034: PUT `/operators/me/staff/:userId`

- Browser: `/api/v1/operators/me/staff/:userId`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:51) — method `assign`.

```typescript
@Put(':userId')
  assign(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: AssignStaffDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-035: GET `/operators/me/stops`

- Browser: `/api/v1/operators/me/stops`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-stop.controller.ts](/home/DoANLienNganh/car/src/stop/presentation/controller/operator-stop.controller.ts:40) — method `findMany`.

```typescript
@Get()
  async findMany(
    @Query() query: GetOperatorStopsQueryDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-036: POST `/operators/me/stops`

- Browser: `/api/v1/operators/me/stops`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-stop.controller.ts](/home/DoANLienNganh/car/src/stop/presentation/controller/operator-stop.controller.ts:24) — method `create`.

```typescript
@Post()
  async create(
    @Body() dto: CreateOperatorStopDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-037: GET `/operators/me/stops/:stopId`

- Browser: `/api/v1/operators/me/stops/:stopId`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-stop.controller.ts](/home/DoANLienNganh/car/src/stop/presentation/controller/operator-stop.controller.ts:61) — method `findById`.

```typescript
@Get(':stopId')
  async findById(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-038: PATCH `/operators/me/stops/:stopId`

- Browser: `/api/v1/operators/me/stops/:stopId`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-stop.controller.ts](/home/DoANLienNganh/car/src/stop/presentation/controller/operator-stop.controller.ts:77) — method `update`.

```typescript
@Patch(':stopId')
  async update(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: UpdateOperatorStopDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-039: PATCH `/operators/me/stops/:stopId/archive`

- Browser: `/api/v1/operators/me/stops/:stopId/archive`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [operator-stop.controller.ts](/home/DoANLienNganh/car/src/stop/presentation/controller/operator-stop.controller.ts:94) — method `archive`.

```typescript
@Patch(':stopId/archive')
  async archive(
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-040: GET `/routes`

- Browser: `/api/v1/routes`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [route.controller.ts](/home/DoANLienNganh/car/src/route/presentation/controller/route.controller.ts:65) — method `getRoutes`.

```typescript
@Get()
  async getRoutes(
    @Query() query: GetRoutesQueryDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-041: POST `/routes`

- Browser: `/api/v1/routes`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [route.controller.ts](/home/DoANLienNganh/car/src/route/presentation/controller/route.controller.ts:50) — method `createRoute`.

```typescript
@Post()
  async createRoute(
    @Body() dto: CreateRouteDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-042: PATCH `/routes/:id`

- Browser: `/api/v1/routes/:id`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [route.controller.ts](/home/DoANLienNganh/car/src/route/presentation/controller/route.controller.ts:80) — method `updateRoute`.

```typescript
@Patch(':id')
  async updateRoute(
    @Param('id', new ParseUUIDPipe()) routeId: string,
    @Body() dto: UpdateRouteDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-043: PATCH `/routes/:id/status`

- Browser: `/api/v1/routes/:id/status`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [route.controller.ts](/home/DoANLienNganh/car/src/route/presentation/controller/route.controller.ts:96) — method `updateRouteStatus`.

```typescript
@Patch(':id/status')
  async updateRouteStatus(
    @Param('id') routeId: string,
    @Body() dto: UpdateRouteStatusDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-044: GET `/routes/locations`

- Browser: `/api/v1/routes/locations`
- Controller authorization: public
- Gateway seed authorization: `public`; enabled=True.
- Source: [route.controller.ts](/home/DoANLienNganh/car/src/route/presentation/controller/route.controller.ts:43) — method `getLocations`.

```typescript
@Get('locations')
  @Public()
  async getLocations()
```

### CAR-045: GET `/staff/me/assignments`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: authenticated + application scope
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:78) — method `getAssignments`.

```typescript
@Get('assignments')
  async getAssignments(@Req() request: AuthenticatedRequest)
```

### CAR-046: GET `/staff/me/trips`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: authenticated + application scope
- Source: [staff.controller.ts](/home/DoANLienNganh/car/src/staff/presentation/staff.controller.ts:92) — method `getAssignedTrips`.

```typescript
@Get('trips')
  async getAssignedTrips(@Req() request: AuthenticatedRequest)
```

### CAR-047: POST `/tickets/check-in`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: authenticated + application scope
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:113) — method `checkIn`.

```typescript
@Post('tickets/check-in')
  checkIn(@Body() body: CheckInDto, @Req() request: AuthenticatedRequest)
```

### CAR-048: GET `/trips`

- Browser: `/api/v1/trips`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:148) — method `getTrips`.

```typescript
@Get()
  async getTrips(
    @Query() query: GetTripsQueryDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-049: POST `/trips`

- Browser: `/api/v1/trips`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:133) — method `createTrip`.

```typescript
@Post()
  async createTrip(
    @Body() dto: CreateTripDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-050: PATCH `/trips/:id/draft`

- Browser: `/api/v1/trips/:id/draft`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:83) — method `updateDraftTrip`.

```typescript
@Patch(':id/draft')
  async updateDraftTrip(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Body() dto: UpdateDraftTripDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-051: GET `/trips/:id/manage`

- Browser: `/api/v1/trips/:id/manage`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:60) — method `getManageTripDetail`.

```typescript
@Get(':id/manage')
  async getManageTripDetail(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-052: PATCH `/trips/:id/status`

- Browser: `/api/v1/trips/:id/status`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:163) — method `updateTripStatus`.

```typescript
@Patch(':id/status')
  async updateTripStatus(
    @Param('id') tripId: string,
    @Body() dto: UpdateTripStatusDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-053: PUT `/trips/:id/stops`

- Browser: `/api/v1/trips/:id/stops`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:108) — method `setTripStops`.

```typescript
@Put(':id/stops')
  async setTripStops(
    @Param('id', new ParseUUIDPipe()) tripId: string,
    @Body() dto: SetTripStopsDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-054: GET `/trips/:tripId`

- Browser: `/api/v1/trips/:tripId`
- Controller authorization: public
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:95) — method `detail`.

```typescript
@Get('trips/:tripId')
  @Public()
  detail(@Param('tripId', new ParseUUIDPipe()) tripId: string)
```

### CAR-055: POST `/trips/:tripId/admin-cancellation`

- Browser: `/api/v1/trips/:tripId/admin-cancellation`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:51) — method `adminCancel`.

```typescript
@Post(':tripId/admin-cancellation')
  adminCancel(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: AdminCancelDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-056: PUT `/trips/:tripId/admin-lifecycle`

- Browser: `/api/v1/trips/:tripId/admin-lifecycle`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:60) — method `adminLifecycle`.

```typescript
@Put(':tripId/admin-lifecycle')
  adminLifecycle(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: LifecycleDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-057: POST `/trips/:tripId/cancel`

- Browser: `/api/v1/trips/:tripId/cancel`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:82) — method `cancelTrip`.

```typescript
@Post('trips/:tripId/cancel')
  cancelTrip(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() body: CancelTripDto,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-058: PUT `/trips/:tripId/class-prices`

- Browser: `/api/v1/trips/:tripId/class-prices`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:92) — method `pricing`.

```typescript
@Put(':tripId/class-prices')
  pricing(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: PricingDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-059: PUT `/trips/:tripId/lifecycle`

- Browser: `/api/v1/trips/:tripId/lifecycle`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:69) — method `lifecycle`.

```typescript
@Put(':tripId/lifecycle')
  lifecycle(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: LifecycleDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-060: GET `/trips/:tripId/manifest`

- Browser: `/api/v1/trips/:tripId/manifest`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:77) — method `manifest`.

```typescript
@Get(':tripId/manifest')
  manifest(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-061: POST `/trips/:tripId/publish`

- Browser: `/api/v1/trips/:tripId/publish`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:58) — method `publish`.

```typescript
@Post('trips/:tripId/publish')
  publish(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-062: POST `/trips/:tripId/resume-sale`

- Browser: `/api/v1/trips/:tripId/resume-sale`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:66) — method `resume`.

```typescript
@Post('trips/:tripId/resume-sale')
  resume(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-063: PUT `/trips/:tripId/seat-blocks`

- Browser: `/api/v1/trips/:tripId/seat-blocks`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:100) — method `blockSeats`.

```typescript
@Put(':tripId/seat-blocks')
  blockSeats(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() dto: SeatBlockDto,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-064: GET `/trips/:tripId/seats`

- Browser: `/api/v1/trips/:tripId/seats`
- Controller authorization: public
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:107) — method `seatMap`.

```typescript
@Get('trips/:tripId/seats')
  @Public()
  seatMap(@Param('tripId', new ParseUUIDPipe()) tripId: string)
```

### CAR-065: POST `/trips/:tripId/stop-sale`

- Browser: `/api/v1/trips/:tripId/stop-sale`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:74) — method `stopSale`.

```typescript
@Post('trips/:tripId/stop-sale')
  stopSale(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Req() request: AuthenticatedRequest,
  )
```

### CAR-066: GET `/trips/:tripId/stops`

- Browser: `/api/v1/trips/:tripId/stops`
- Controller authorization: public
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport.controller.ts:101) — method `stops`.

```typescript
@Get('trips/:tripId/stops')
  @Public()
  async stops(@Param('tripId', new ParseUUIDPipe()) tripId: string)
```

### CAR-067: POST `/trips/:tripId/tickets/:ticketId/no-show`

- Browser: `/api/v1/trips/:tripId/tickets/:ticketId/no-show`
- Controller authorization: authenticated + application scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [transport-operations.controller.ts](/home/DoANLienNganh/car/src/transport/presentation/transport-operations.controller.ts:84) — method `noShow`.

```typescript
@Post(':tripId/tickets/:ticketId/no-show')
  noShow(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('ticketId', new ParseUUIDPipe()) ticketId: string,
    @Req() req: AuthenticatedRequest,
  )
```

### CAR-068: GET `/trips/search`

- Browser: `/api/v1/trips/search`
- Controller authorization: public
- Gateway seed authorization: `public`; enabled=True.
- Source: [trip.controller.ts](/home/DoANLienNganh/car/src/trip/presentation/controller/trip.controller.ts:52) — method `searchTrips`.

```typescript
@Get('search')
  @Public()
  async searchTrips(@Query() query: SearchTripsQueryDto)
```

## cart

### CART-001: GET `/api/v1/internal/orders/transport/item-operations/{id}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/InternalItemOperationController.java:11) — method `get`.

```java
public ApiResponse<ItemOperationRepository.Operation> get(@PathVariable UUID id)
```

### CART-002: GET `/api/v1/internal/orders/transport/item-operations/{id}/cash-proof`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/InternalItemOperationController.java:12) — method `cash`.

```java
public ApiResponse<Map<String,Object>> cash(@PathVariable UUID id)
```

### CART-003: GET `/api/v1/internal/orders/transport/item-operations/{id}/refund-proof`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/InternalItemOperationController.java:13) — method `refund`.

```java
public ApiResponse<Map<String,Object>> refund(@PathVariable UUID id)
```

### CART-004: GET `/api/v1/internal/orders/transport/trips/{tripId}/cancellation`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TripCancellationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TripCancellationController.java:31) — method `progress`.

```java
public ResponseEntity<ApiResponse<TripCancellationService.Progress>> progress(@PathVariable UUID tripId)
```

### CART-005: PUT `/api/v1/internal/orders/transport/trips/{tripId}/cancellation`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TripCancellationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TripCancellationController.java:24) — method `request`.

```java
public ResponseEntity<ApiResponse<TripCancellationService.Progress>> request(
            @PathVariable UUID tripId, @RequestBody CancelRequest request)
```

### CART-006: PUT `/api/v1/internal/orders/transport/trips/{tripId}/complete`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TripCancellationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TripCancellationController.java:16) — method `complete`.

```java
public ResponseEntity<ApiResponse<Void>> complete(@PathVariable UUID tripId)
```

### CART-007: GET `/api/v1/internal/orders/users/{userId}/listings/{listingId}/completed`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:64) — method `hasCompletedListingOrder`.

```java
public ResponseEntity<ApiResponse<Boolean>> hasCompletedListingOrder(
            @PathVariable UUID userId,
            @PathVariable UUID listingId
    )
```

### CART-008: PUT `/api/v1/internal/orders/{orderId}/payment-failed`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:45) — method `handlePaymentFailed`.

```java
public ResponseEntity<ApiResponse<Void>> handlePaymentFailed(@PathVariable UUID orderId)
```

### CART-009: PUT `/api/v1/internal/orders/{orderId}/payment-review`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:53) — method `handlePaymentReview`.

```java
public ResponseEntity<ApiResponse<Void>> handlePaymentReview(@PathVariable UUID orderId)
```

### CART-010: PUT `/api/v1/internal/orders/{orderId}/payment-success`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:37) — method `handlePaymentSuccess`.

```java
public ResponseEntity<ApiResponse<Void>> handlePaymentSuccess(@PathVariable UUID orderId)
```

### CART-011: GET `/api/v1/internal/orders/{orderId}/payment-summary`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:26) — method `getPaymentSummary`.

```java
public ResponseEntity<ApiResponse<OrderPaymentSummaryResponse>> getPaymentSummary(@PathVariable UUID orderId)
```

### CART-012: GET `/api/v1/internal/orders/{orderId}/transport-fulfillment`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/InternalOrderController.java:31) — method `getTransportFulfillment`.

```java
public ResponseEntity<ApiResponse<TransportOrderService.FulfillmentSummary>> getTransportFulfillment(
            @PathVariable UUID orderId)
```

### CART-013: GET `/api/v1/orders`

- Browser: `/api/v1/orders`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:95) — method `getUserOrders`.

```java
public ResponseEntity<ApiResponse<Page<OrderResponse>>> getUserOrders(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) List<OrderStatus> statuses,
            @RequestParam(defaultValue = "") String search,
            Pageable pageable)
```

### CART-014: GET `/api/v1/orders/admin`

- Browser: `/api/v1/orders/admin`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:56) — method `getAdminOrders`.

```java
public ResponseEntity<ApiResponse<Page<OrderResponse>>> getAdminOrders(Pageable pageable)
```

### CART-015: GET `/api/v1/orders/admin/disputes`

- Browser: `/api/v1/orders/admin/disputes`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:71) — method `getAdminDisputes`.

```java
public ResponseEntity<ApiResponse<Page<OrderDisputeResponse>>> getAdminDisputes(
            @RequestParam(required = false) DisputeStatus status,
            Pageable pageable)
```

### CART-016: PUT `/api/v1/orders/admin/disputes/{disputeId}/resolve`

- Browser: `/api/v1/orders/admin/disputes/:disputeId/resolve`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:79) — method `resolveDispute`.

```java
public ResponseEntity<ApiResponse<OrderDisputeResponse>> resolveDispute(
            @RequestHeader("X-User-Id") UUID adminId,
            @PathVariable UUID disputeId,
            @RequestBody @Valid ResolveOrderDisputeRequest request)
```

### CART-017: GET `/api/v1/orders/admin/summary`

- Browser: `/api/v1/orders/admin/summary`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:50) — method `getAdminSummary`.

```java
public ResponseEntity<ApiResponse<AdminOrderSummaryResponse>> getAdminSummary()
```

### CART-018: PUT `/api/v1/orders/admin/{orderId}/force-cancel`

- Browser: `/api/v1/orders/admin/:orderId/force-cancel`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:62) — method `forceCancelOrder`.

```java
public ResponseEntity<ApiResponse<Void>> forceCancelOrder(
            @PathVariable UUID orderId,
            @RequestBody(required = false) ForceCancelOrderRequest request)
```

### CART-019: POST `/api/v1/orders/book-now`

- Browser: `/api/v1/orders/book-now`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:43) — method `bookNow`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> bookNow(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid BookNowRequest request)
```

### CART-020: GET `/api/v1/orders/check-purchased/{listingId}`

- Browser: `/api/v1/orders/check-purchased/:listingId`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:141) — method `checkPurchased`.

```java
public ResponseEntity<ApiResponse<Boolean>> checkPurchased(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID listingId)
```

### CART-021: POST `/api/v1/orders/checkout-cart`

- Browser: `/api/v1/orders/checkout-cart`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:36) — method `checkoutCart`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> checkoutCart(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CheckoutCartRequest request)
```

### CART-022: GET `/api/v1/orders/disputes`

- Browser: `/api/v1/orders/disputes`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:111) — method `getMyDisputes`.

```java
public ResponseEntity<ApiResponse<Page<OrderDisputeResponse>>> getMyDisputes(
            @RequestHeader("X-User-Id") UUID userId,
            Pageable pageable)
```

### CART-023: POST `/api/v1/orders/disputes`

- Browser: `/api/v1/orders/disputes`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:104) — method `createDispute`.

```java
public ResponseEntity<ApiResponse<OrderDisputeResponse>> createDispute(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreateOrderDisputeRequest request)
```

### CART-024: GET `/api/v1/orders/host`

- Browser: `/api/v1/orders/host`
- Controller authorization: "hasRole('HOST') or hasRole('ENTERPRISE') or hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:118) — method `getHostOrders`.

```java
public ResponseEntity<ApiResponse<Page<OrderResponse>>> getHostOrders(
            @RequestHeader("X-User-Id") UUID hostId,
            Pageable pageable)
```

### CART-025: GET `/api/v1/orders/transport/admin/attention`

- Browser: `/api/v1/orders/transport/admin/attention`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:120) — method `attention`.

```java
public ResponseEntity<ApiResponse<Page<OrderResponse>>> attention(Pageable pageable)
```

### CART-026: POST `/api/v1/orders/transport/admin/exchanges`

- Browser: `/api/v1/orders/transport/admin/exchanges`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:85) — method `exchange`.

```java
public ResponseEntity<ApiResponse<TransportExchangeService.ExchangeCase>> exchange(
            @AuthenticationPrincipal Jwt jwt, @RequestBody @Valid ExchangeRequest request)
```

### CART-027: GET `/api/v1/orders/transport/admin/exchanges/exceptions`

- Browser: `/api/v1/orders/transport/admin/exchanges/exceptions`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:96) — method `exchangeExceptions`.

```java
public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String,Object>>>> exchangeExceptions()
```

### CART-028: GET `/api/v1/orders/transport/admin/exchanges/{oldOrderId}`

- Browser: `/api/v1/orders/transport/admin/exchanges/:oldOrderId`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:108) — method `exchangeStatus`.

```java
public ResponseEntity<ApiResponse<TransportExchangeService.ExchangeCase>> exchangeStatus(
            @PathVariable UUID oldOrderId)
```

### CART-029: POST `/api/v1/orders/transport/admin/exchanges/{oldOrderId}/resolve-exception`

- Browser: `/api/v1/orders/transport/admin/exchanges/:oldOrderId/resolve-exception`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:100) — method `resolveExchange`.

```java
public ResponseEntity<ApiResponse<Void>> resolveExchange(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID oldOrderId, @RequestBody @Valid ReconciliationNote request)
```

### CART-030: GET `/api/v1/orders/transport/admin/item-operations/attention`

- Browser: `/api/v1/orders/transport/admin/item-operations/attention`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:32) — method `attention`.

```java
public ApiResponse<java.util.List<ItemOperationRepository.Operation>> attention()
```

### CART-031: POST `/api/v1/orders/transport/admin/item-operations/{id}/abort`

- Browser: `/api/v1/orders/transport/admin/item-operations/:id/abort`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:25) — method `adminAbort`.

```java
public ApiResponse<String> adminAbort(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id)
```

### CART-032: POST `/api/v1/orders/transport/admin/item-operations/{id}/refund`

- Browser: `/api/v1/orders/transport/admin/item-operations/:id/refund`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:31) — method `refund`.

```java
public ApiResponse<String> refund(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof)
```

### CART-033: POST `/api/v1/orders/transport/admin/item-operations/{id}/retry`

- Browser: `/api/v1/orders/transport/admin/item-operations/:id/retry`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:33) — method `adminRetry`.

```java
public ApiResponse<String> adminRetry(@PathVariable UUID id)
```

### CART-034: GET `/api/v1/orders/transport/admin/notifications`

- Browser: `/api/v1/orders/transport/admin/notifications`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:43) — method `notifications`.

```java
public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String,Object>>>> notifications()
```

### CART-035: POST `/api/v1/orders/transport/admin/notifications/{eventId}/retry`

- Browser: `/api/v1/orders/transport/admin/notifications/:eventId/retry`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:47) — method `retryNotification`.

```java
public ResponseEntity<ApiResponse<Void>> retryNotification(@PathVariable UUID eventId)
```

### CART-036: GET `/api/v1/orders/transport/admin/reconciliation`

- Browser: `/api/v1/orders/transport/admin/reconciliation`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:56) — method `findings`.

```java
public ResponseEntity<ApiResponse<java.util.List<TransportReconciliationService.Finding>>> findings(
            @RequestParam(defaultValue = "100") int limit)
```

### CART-037: PUT `/api/v1/orders/transport/admin/reconciliation/{orderId}/refresh`

- Browser: `/api/v1/orders/transport/admin/reconciliation/:orderId/refresh`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:62) — method `refresh`.

```java
public ResponseEntity<ApiResponse<java.util.List<TransportReconciliationService.Finding>>> refresh(
            @PathVariable UUID orderId)
```

### CART-038: POST `/api/v1/orders/transport/admin/reconciliation/{orderId}/{code}/notes`

- Browser: `/api/v1/orders/transport/admin/reconciliation/:orderId/:code/notes`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:70) — method `addReconciliationNote`.

```java
public ResponseEntity<ApiResponse<Void>> addReconciliationNote(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @PathVariable String code,
            @RequestBody @Valid ReconciliationNote request)
```

### CART-039: PUT `/api/v1/orders/transport/admin/refunds/{orderId}/complete`

- Browser: `/api/v1/orders/transport/admin/refunds/:orderId/complete`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:130) — method `complete`.

```java
public ResponseEntity<ApiResponse<Void>> complete(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody @Valid CompleteRefundRequest request)
```

### CART-040: PUT `/api/v1/orders/transport/admin/refunds/{orderId}/open-paid-review`

- Browser: `/api/v1/orders/transport/admin/refunds/:orderId/open-paid-review`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:144) — method `openPaidReview`.

```java
public ResponseEntity<ApiResponse<Void>> openPaidReview(@PathVariable UUID orderId)
```

### CART-041: GET `/api/v1/orders/transport/admin/reports/overview`

- Browser: `/api/v1/orders/transport/admin/reports/overview`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:38) — method `overviewReport`.

```java
public ResponseEntity<ApiResponse<java.util.Map<String,Object>>> overviewReport(
            @RequestParam java.time.LocalDate from, @RequestParam java.time.LocalDate to)
```

### CART-042: GET `/api/v1/orders/transport/admin/reports/{operatorUserId}`

- Browser: `/api/v1/orders/transport/admin/reports/:operatorUserId`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:33) — method `report`.

```java
public ResponseEntity<ApiResponse<java.util.Map<String,Object>>> report(@PathVariable UUID operatorUserId,
            @RequestParam java.time.LocalDate from, @RequestParam java.time.LocalDate to)
```

### CART-043: GET `/api/v1/orders/transport/admin/trip-cancellations/{tripId}`

- Browser: `/api/v1/orders/transport/admin/trip-cancellations/:tripId`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportAdminController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportAdminController.java:114) — method `tripCancellationStatus`.

```java
public ResponseEntity<ApiResponse<TripCancellationService.Progress>> tripCancellationStatus(
            @PathVariable UUID tripId)
```

### CART-044: POST `/api/v1/orders/transport/cash/checkout`

- Browser: `/api/v1/orders/transport/cash/checkout`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:70) — method `checkout`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> checkout(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String key,
            @RequestBody @Valid TransportCheckoutRequest request)
```

### CART-045: POST `/api/v1/orders/transport/cash/orders/{orderId}/cancel-paid`

- Browser: `/api/v1/orders/transport/cash/orders/:orderId/cancel-paid`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:92) — method `cancelPaid`.

```java
public ResponseEntity<ApiResponse<Void>> cancelPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody(required = false) CancelPaidRequest request)
```

### CART-046: POST `/api/v1/orders/transport/cash/orders/{orderId}/cancel-unpaid`

- Browser: `/api/v1/orders/transport/cash/orders/:orderId/cancel-unpaid`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:83) — method `cancelUnpaid`.

```java
public ResponseEntity<ApiResponse<Void>> cancelUnpaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId)
```

### CART-047: POST `/api/v1/orders/transport/cash/orders/{orderId}/receive`

- Browser: `/api/v1/orders/transport/cash/orders/:orderId/receive`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:77) — method `receive`.

```java
public ResponseEntity<ApiResponse<CashService.CashReceiptResult>> receive(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody @Valid ReceiveRequest request)
```

### CART-048: GET `/api/v1/orders/transport/cash/shifts`

- Browser: `/api/v1/orders/transport/cash/shifts`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:48) — method `listShifts`.

```java
public ResponseEntity<ApiResponse<java.util.List<CashLedger.Shift>>> listShifts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size)
```

### CART-049: POST `/api/v1/orders/transport/cash/shifts`

- Browser: `/api/v1/orders/transport/cash/shifts`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:37) — method `openShift`.

```java
public ResponseEntity<ApiResponse<CashLedger.Shift>> openShift(@AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid OpenShiftRequest request)
```

### CART-050: POST `/api/v1/orders/transport/cash/shifts/close`

- Browser: `/api/v1/orders/transport/cash/shifts/close`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:64) — method `closeShift`.

```java
public ResponseEntity<ApiResponse<CashLedger.ClosedShift>> closeShift(@AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid CloseShiftRequest request)
```

### CART-051: GET `/api/v1/orders/transport/cash/shifts/me`

- Browser: `/api/v1/orders/transport/cash/shifts/me`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:43) — method `getMyShifts`.

```java
public ResponseEntity<ApiResponse<java.util.List<CashLedger.Shift>>> getMyShifts(@AuthenticationPrincipal Jwt jwt)
```

### CART-052: GET `/api/v1/orders/transport/cash/shifts/{shiftId}`

- Browser: `/api/v1/orders/transport/cash/shifts/:shiftId`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CashController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/cash/presentation/CashController.java:57) — method `getShiftDetail`.

```java
public ResponseEntity<ApiResponse<CashLedger.ShiftDetail>> getShiftDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID shiftId)
```

### CART-053: POST `/api/v1/orders/transport/checkout`

- Browser: `/api/v1/orders/transport/checkout`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:24) — method `checkout`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody @Valid TransportCheckoutRequest request)
```

### CART-054: GET `/api/v1/orders/transport/item-operations/{id}`

- Browser: `/api/v1/orders/transport/item-operations/:id`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:20) — method `get`.

```java
public ApiResponse<ItemOperationService.View> get(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id)
```

### CART-055: POST `/api/v1/orders/transport/item-operations/{id}/abort`

- Browser: `/api/v1/orders/transport/item-operations/:id/abort`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:24) — method `abort`.

```java
public ApiResponse<ItemOperationService.View> abort(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id)
```

### CART-056: POST `/api/v1/orders/transport/item-operations/{id}/cash-refund`

- Browser: `/api/v1/orders/transport/item-operations/:id/cash-refund`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:28) — method `cashRefund`.

```java
public ApiResponse<ItemOperationService.View> cashRefund(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof)
```

### CART-057: POST `/api/v1/orders/transport/item-operations/{id}/cash-topup`

- Browser: `/api/v1/orders/transport/item-operations/:id/cash-topup`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:27) — method `cash`.

```java
public ApiResponse<ItemOperationService.View> cash(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@RequestBody Proof proof)
```

### CART-058: POST `/api/v1/orders/transport/item-operations/{id}/retry`

- Browser: `/api/v1/orders/transport/item-operations/:id/retry`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:21) — method `retry`.

```java
public ApiResponse<ItemOperationService.View> retry(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id)
```

### CART-059: GET `/api/v1/orders/transport/vendor`

- Browser: `/api/v1/orders/transport/vendor`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:76) — method `listVendorOrders`.

```java
public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<OrderResponse>>> listVendorOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam(required = false) com.GoTravel.CartandOrder.enums.OrderStatus status,
            @RequestParam(required=false) UUID tripId,
            @RequestParam(required=false) com.GoTravel.CartandOrder.enums.PaymentMethod method,
            @RequestParam(required=false) String search,
            @RequestParam(required=false) java.time.LocalDate from,
            @RequestParam(required=false) java.time.LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size)
```

### CART-060: GET `/api/v1/orders/transport/vendor/amendments/attention`

- Browser: `/api/v1/orders/transport/vendor/amendments/attention`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:152) — method `listAttentionAmendments`.

```java
public ResponseEntity<ApiResponse<List<TransportAmendmentService.AmendmentRecord>>> listAttentionAmendments(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId)
```

### CART-061: POST `/api/v1/orders/transport/vendor/amendments/{commandId}/retry`

- Browser: `/api/v1/orders/transport/vendor/amendments/:commandId/retry`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:162) — method `retryAmendment`.

```java
public ResponseEntity<ApiResponse<TransportAmendmentService.AmendmentRecord>> retryAmendment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID commandId)
```

### CART-062: GET `/api/v1/orders/transport/vendor/reports`

- Browser: `/api/v1/orders/transport/vendor/reports`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:114) — method `vendorReport`.

```java
public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> vendorReport(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) UUID operatorId,
            @RequestParam java.time.LocalDate from,
            @RequestParam java.time.LocalDate to)
```

### CART-063: GET `/api/v1/orders/transport/vendor/{orderId}`

- Browser: `/api/v1/orders/transport/vendor/:orderId`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:96) — method `getVendorOrderDetail`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> getVendorOrderDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId)
```

### CART-064: GET `/api/v1/orders/transport/vendor/{orderId}/items/{itemId}/ticket-document`

- Browser: `/api/v1/orders/transport/vendor/:orderId/items/:itemId/ticket-document`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:107) — method `counterTicket`.

```java
public ResponseEntity<ApiResponse<TransportOrderService.CounterTicketDocument>> counterTicket(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId)
```

### CART-065: POST `/api/v1/orders/transport/{orderId}/cancel-paid`

- Browser: `/api/v1/orders/transport/:orderId/cancel-paid`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:63) — method `cancelPaid`.

```java
public ResponseEntity<ApiResponse<Void>> cancelPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId, @RequestBody(required = false) CancelPaidRequest request)
```

### CART-066: POST `/api/v1/orders/transport/{orderId}/cancel-unpaid`

- Browser: `/api/v1/orders/transport/:orderId/cancel-unpaid`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:39) — method `cancelUnpaid`.

```java
public ResponseEntity<ApiResponse<Void>> cancelUnpaid(@AuthenticationPrincipal Jwt jwt,
                                                          @PathVariable UUID orderId)
```

### CART-067: GET `/api/v1/orders/transport/{orderId}/cancellation-preview`

- Browser: `/api/v1/orders/transport/:orderId/cancellation-preview`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:51) — method `cancellationPreview`.

```java
public ResponseEntity<ApiResponse<CancellationPolicy.Quote>> cancellationPreview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId)
```

### CART-068: POST `/api/v1/orders/transport/{orderId}/items/{itemId}/amend`

- Browser: `/api/v1/orders/transport/:orderId/items/:itemId/amend`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:127) — method `amend`.

```java
public ResponseEntity<ApiResponse<TransportAmendmentService.AmendmentRecord>> amend(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @PathVariable UUID itemId,
            @RequestBody @Valid TransportAmendmentService.AmendRequest request)
```

### CART-069: GET `/api/v1/orders/transport/{orderId}/items/{itemId}/amendments`

- Browser: `/api/v1/orders/transport/:orderId/items/:itemId/amendments`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportOrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/TransportOrderController.java:140) — method `listAmendments`.

```java
public ResponseEntity<ApiResponse<List<TransportAmendmentService.AmendmentRecord>>> listAmendments(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @PathVariable UUID itemId)
```

### CART-070: POST `/api/v1/orders/transport/{orderId}/items/{itemId}/cancel`

- Browser: `/api/v1/orders/transport/:orderId/items/:itemId/cancel`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:18) — method `cancel`.

```java
public ApiResponse<ItemOperationService.View> cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody ItemOperationService.Request request)
```

### CART-071: POST `/api/v1/orders/transport/{orderId}/items/{itemId}/exchange`

- Browser: `/api/v1/orders/transport/:orderId/items/:itemId/exchange`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:19) — method `exchange`.

```java
public ApiResponse<ItemOperationService.View> exchange(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody ItemOperationService.Request request)
```

### CART-072: POST `/api/v1/orders/transport/{orderId}/items/{itemId}/operation-preview`

- Browser: `/api/v1/orders/transport/:orderId/items/:itemId/operation-preview`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [ItemOperationController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/transport/adjustment/presentation/ItemOperationController.java:23) — method `preview`.

```java
public ApiResponse<ItemOperationService.Preview> preview(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID orderId,@PathVariable UUID itemId,@RequestBody PreviewRequest request)
```

### CART-073: GET `/api/v1/orders/{orderId}`

- Browser: `/api/v1/orders/:orderId`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:88) — method `getOrderDetails`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> getOrderDetails(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId)
```

### CART-074: PUT `/api/v1/orders/{orderId}/cancel`

- Browser: `/api/v1/orders/:orderId/cancel`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:126) — method `cancelOrder`.

```java
public ResponseEntity<ApiResponse<Void>> cancelOrder(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId)
```

### CART-075: POST `/api/v1/orders/{orderId}/ticket-email/resend`

- Browser: `/api/v1/orders/:orderId/ticket-email/resend`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [OrderController.java](/home/DoANLienNganh/CartandOrder/src/main/java/com/GoTravel/CartandOrder/controller/OrderController.java:134) — method `resendTicketEmail`.

```java
public ResponseEntity<ApiResponse<OrderResponse>> resendTicketEmail(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId)
```

## catalog

### CATALOG-001: GET `/api/v1/catalog/admin/landmark-suggestions`

- Browser: `/api/v1/catalog/admin/landmark-suggestions`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:42) — method `getLandmarkSuggestions`.

```java
public ResponseEntity<ApiResponse<PaginationResponse<LandmarkSuggestion>>> getLandmarkSuggestions(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### CATALOG-002: PUT `/api/v1/catalog/admin/landmark-suggestions/{suggestionId}/status`

- Browser: `/api/v1/catalog/admin/landmark-suggestions/:suggestionId/status`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:61) — method `updateSuggestionStatus`.

```java
public ResponseEntity<ApiResponse<Void>> updateSuggestionStatus(
            @PathVariable UUID suggestionId,
            @RequestBody @Valid UpdateSuggestionStatusRequest request)
```

### CATALOG-003: GET `/api/v1/catalog/admin/landmarks`

- Browser: `/api/v1/catalog/admin/landmarks`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:73) — method `getLandmarks`.

```java
public ResponseEntity<ApiResponse<PaginationResponse<com.Listing.CatalogandListing.entity.Landmark>>> getLandmarks(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### CATALOG-004: POST `/api/v1/catalog/admin/landmarks`

- Browser: `/api/v1/catalog/admin/landmarks`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:90) — method `createLandmark`.

```java
public ResponseEntity<ApiResponse<Void>> createLandmark(@RequestBody @Valid SaveLandmarkRequest request)
```

### CATALOG-005: PUT `/api/v1/catalog/admin/landmarks/{landmarkId}`

- Browser: `/api/v1/catalog/admin/landmarks/:landmarkId`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:105) — method `updateLandmark`.

```java
public ResponseEntity<ApiResponse<Void>> updateLandmark(@PathVariable UUID landmarkId,
            @RequestBody @Valid SaveLandmarkRequest request)
```

### CATALOG-006: PATCH `/api/v1/catalog/admin/landmarks/{landmarkId}/status`

- Browser: `/api/v1/catalog/admin/landmarks/:landmarkId/status`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:122) — method `changeLandmarkStatus`.

```java
public ResponseEntity<ApiResponse<Void>> changeLandmarkStatus(
            @PathVariable UUID landmarkId,
            @RequestBody @Valid UpdateLandmarkStatusRequest request)
```

### CATALOG-007: GET `/api/v1/catalog/admin/listings`

- Browser: `/api/v1/catalog/admin/listings`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:134) — method `getListings`.

```java
public ResponseEntity<ApiResponse<PaginationResponse<com.Listing.CatalogandListing.dto.response.ListingDetailResponse>>> getListings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### CATALOG-008: PATCH `/api/v1/catalog/admin/listings/{listingId}/status`

- Browser: `/api/v1/catalog/admin/listings/:listingId/status`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:148) — method `changeListingStatus`.

```java
public ResponseEntity<ApiResponse<Void>> changeListingStatus(
            @PathVariable UUID listingId,
            @RequestParam String status)
```

### CATALOG-009: GET `/api/v1/catalog/admin/summary`

- Browser: `/api/v1/catalog/admin/summary`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogAdminController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogAdminController.java:27) — method `getSummary`.

```java
public ResponseEntity<ApiResponse<com.Listing.CatalogandListing.dto.response.AdminCatalogSummaryResponse>> getSummary()
```

### CATALOG-010: GET `/api/v1/catalog/host/complexes`

- Browser: `/api/v1/catalog/host/complexes`
- Controller authorization: "hasRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:66) — method `getMyComplexes`.

```java
public ResponseEntity<ApiResponse<java.util.List<com.Listing.CatalogandListing.dto.response.ComplexResponse>>> getMyComplexes()
```

### CATALOG-011: POST `/api/v1/catalog/host/complexes`

- Browser: `/api/v1/catalog/host/complexes`
- Controller authorization: "hasRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:55) — method `createComplex`.

```java
public ResponseEntity<ApiResponse<Void>> createComplex(@RequestBody @Valid CreateComplexRequest request)
```

### CATALOG-012: DELETE `/api/v1/catalog/host/complexes/{complexId}`

- Browser: `/api/v1/catalog/host/complexes/:complexId`
- Controller authorization: "hasRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:93) — method `deleteComplex`.

```java
public ResponseEntity<ApiResponse<Void>> deleteComplex(@PathVariable UUID complexId)
```

### CATALOG-013: GET `/api/v1/catalog/host/complexes/{complexId}`

- Browser: `/api/v1/catalog/host/complexes/:complexId`
- Controller authorization: "hasRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:74) — method `getMyComplex`.

```java
public ResponseEntity<ApiResponse<com.Listing.CatalogandListing.dto.response.ComplexResponse>> getMyComplex(
            @PathVariable UUID complexId)
```

### CATALOG-014: PUT `/api/v1/catalog/host/complexes/{complexId}`

- Browser: `/api/v1/catalog/host/complexes/:complexId`
- Controller authorization: "hasRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:83) — method `updateComplex`.

```java
public ResponseEntity<ApiResponse<Void>> updateComplex(
            @PathVariable UUID complexId,
            @RequestBody @Valid CreateComplexRequest request)
```

### CATALOG-015: POST `/api/v1/catalog/host/landmark-suggestions`

- Browser: `/api/v1/catalog/host/landmark-suggestions`
- Controller authorization: "hasAnyRole('HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:39) — method `suggestLandmark`.

```java
public ResponseEntity<ApiResponse<Void>> suggestLandmark(
            @RequestBody @Valid SuggestLandmarkRequest suggestLandmarkRequest)
```

### CATALOG-016: GET `/api/v1/catalog/host/listings`

- Browser: `/api/v1/catalog/host/listings`
- Controller authorization: "hasAnyRole('HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:122) — method `getMyListings`.

```java
public ResponseEntity<ApiResponse<PaginationResponse<ListingDetailResponse>>> getMyListings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### CATALOG-017: POST `/api/v1/catalog/host/listings`

- Browser: `/api/v1/catalog/host/listings`
- Controller authorization: "hasAnyRole('HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:112) — method `createListing`.

```java
public ResponseEntity<ApiResponse<Void>> createListing(@RequestBody @Valid SaveListingRequest request)
```

### CATALOG-018: DELETE `/api/v1/catalog/host/listings/{listingId}`

- Browser: `/api/v1/catalog/host/listings/:listingId`
- Controller authorization: "hasAnyRole('HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:156) — method `deleteListing`.

```java
public ResponseEntity<ApiResponse<Void>> deleteListing(@PathVariable UUID listingId)
```

### CATALOG-019: PUT `/api/v1/catalog/host/listings/{listingId}`

- Browser: `/api/v1/catalog/host/listings/:listingId`
- Controller authorization: "hasAnyRole('HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogHostController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogHostController.java:140) — method `updateListing`.

```java
public ResponseEntity<ApiResponse<Void>> updateListing(@PathVariable UUID listingId,
            @RequestBody @Valid SaveListingRequest request)
```

### CATALOG-020: GET `/api/v1/catalog/listings/landmarks`

- Browser: `/api/v1/catalog/listings/landmarks`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [CatalogPublicController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogPublicController.java:26) — method `getPublicLandmarks`.

```java
public ResponseEntity<ApiResponse<List<Landmark>>> getPublicLandmarks()
```

### CATALOG-021: GET `/api/v1/catalog/listings/{listingId}`

- Browser: `/api/v1/catalog/listings/:listingId`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [CatalogPublicController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogPublicController.java:40) — method `getListingDetail`.

```java
public ResponseEntity<ApiResponse<ListingDetailResponse>> getListingDetail(@PathVariable UUID listingId)
```

### CATALOG-022: GET `/api/v1/catalog/listings/{listingId}/reviews`

- Browser: `/api/v1/catalog/listings/:listingId/reviews`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [CatalogPublicController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogPublicController.java:56) — method `getListingReviews`.

```java
public ResponseEntity<ApiResponse<PaginationResponse<ReviewItemResponse>>> getListingReviews(
            @PathVariable UUID listingId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### CATALOG-023: POST `/api/v1/catalog/reviews`

- Browser: `/api/v1/catalog/reviews`
- Controller authorization: see security/service scope
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [CatalogUserController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/controller/CatalogUserController.java:27) — method `submitReview`.

```java
public ResponseEntity<ApiResponse<Void>> submitReview(@RequestBody @Valid SubmitReviewRequest request)
```

### CATALOG-024: PUT `/api/v1/catalog/transport/offers/{listingId}/content`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: "hasAuthority('TICKET_VENDOR')"
- Source: [TransportContentController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/transport/TransportContentController.java:23) — method `update`.

```java
public ApiResponse<TransportOfferService.OfferResult> update(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID listingId, @RequestBody @Valid Content content)
```

### CATALOG-025: GET `/api/v1/internal/catalog/transport-offers/active-routes`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportOfferController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/transport/TransportOfferController.java:27) — method `activeRoutes`.

```java
public ResponseEntity<ApiResponse<java.util.List<UUID>>> activeRoutes()
```

### CATALOG-026: GET `/api/v1/internal/catalog/transport-offers/routes/{routeId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportOfferController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/transport/TransportOfferController.java:32) — method `get`.

```java
public ResponseEntity<ApiResponse<TransportOfferService.OfferResult>> get(@PathVariable UUID routeId)
```

### CATALOG-027: PUT `/api/v1/internal/catalog/transport-offers/routes/{routeId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportOfferController.java](/home/DoANLienNganh/CatalogandListing/src/main/java/com/Listing/CatalogandListing/transport/TransportOfferController.java:17) — method `upsert`.

```java
public ResponseEntity<ApiResponse<TransportOfferService.OfferResult>> upsert(
            @PathVariable UUID routeId, @RequestBody @Valid TransportOfferService.OfferRequest request)
```

## identity

### IDENTITY-001: GET `/.well-known/jwks.json`

- Browser: `CALLBACK — không gọi để giả lập thành công`
- Controller authorization: provider/server callback
- Source: [JwksController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/JwksController.java:24) — method `keys`.

```java
public Map<String, Object> keys()
```

### IDENTITY-002: POST `/api/auth/forgot-password`

- Browser: `/api/v1/auth/forgot-password`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [AuthenticationController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/AuthenticationController.java:39) — method `forgotPassword`.

```java
public ApiRequest<Void> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request)
```

### IDENTITY-003: POST `/api/auth/login`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: see security/service scope
- Source: [AuthenticationController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/AuthenticationController.java:33) — method `authenticate`.

```java
public ApiRequest<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request)
```

### IDENTITY-004: POST `/api/auth/refresh-roles`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: see security/service scope
- Source: [AuthenticationController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/AuthenticationController.java:56) — method `refreshRoles`.

```java
public ApiRequest<AuthenticationResponse> refreshRoles()
```

### IDENTITY-005: POST `/api/auth/reset-password`

- Browser: `/api/v1/auth/reset-password`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [AuthenticationController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/AuthenticationController.java:45) — method `resetPassword`.

```java
public ApiRequest<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest request)
```

### IDENTITY-006: GET `/api/users`

- Browser: `/api/v1/admin/users`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:36) — method `getAllUser`.

```java
public ApiRequest<PageResponse<UserResponse>> getAllUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword)
```

### IDENTITY-007: POST `/api/users`

- Browser: `/api/v1/auth/register`
- Controller authorization: see security/service scope
- Gateway seed authorization: `public`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:31) — method `createUser`.

```java
public ApiRequest<UserResponse> createUser(@RequestBody @Valid UserRequest user)
```

### IDENTITY-008: PUT `/api/users/accounts/{accountId}/status`

- Browser: `/api/v1/admin/accounts/:accountId/status`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:126) — method `updateBanAccountStatus`.

```java
public ApiRequest<Void> updateBanAccountStatus(
            @PathVariable String accountId,
            @RequestBody AccountStatusRequest request)
```

### IDENTITY-009: GET `/api/users/admin/summary`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: "hasRole('ADMIN')"
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:45) — method `getAdminSummary`.

```java
public ApiRequest<AdminIdentitySummaryResponse> getAdminSummary()
```

### IDENTITY-010: DELETE `/api/users/admin/{id}`

- Browser: `/api/v1/admin/users/:id`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:162) — method `deleteAccount`.

```java
public ApiRequest<Void> deleteAccount(@PathVariable String id)
```

### IDENTITY-011: GET `/api/users/admin/{id}`

- Browser: `/api/v1/admin/users/:id`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:156) — method `getUserById`.

```java
public ApiRequest<UserResponse> getUserById(@PathVariable String id)
```

### IDENTITY-012: PATCH `/api/users/admin/{id}`

- Browser: `/api/v1/admin/users/:id`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:172) — method `banAccount`.

```java
public  ApiRequest<Void> banAccount(@PathVariable String id)
```

### IDENTITY-013: GET `/api/users/enterprises`

- Browser: `/api/v1/admin/enterprises/approved`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:68) — method `getAllEnterprisePending`.

```java
public ApiRequest<PageResponse<UserResponse>> getAllEnterprisePending(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### IDENTITY-014: GET `/api/users/enterprises/all`

- Browser: `/api/v1/admin/enterprises/all`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:77) — method `getAllEnterprises`.

```java
public ApiRequest<PageResponse<UserResponse>> getAllEnterprises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### IDENTITY-015: GET `/api/users/hosts`

- Browser: `/api/v1/admin/hosts/approved`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:51) — method `getAllHostPending`.

```java
public ApiRequest<PageResponse<UserResponse>> getAllHostPending(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### IDENTITY-016: GET `/api/users/hosts/all`

- Browser: `/api/v1/admin/hosts/all`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:60) — method `getAllHosts`.

```java
public ApiRequest<PageResponse<UserResponse>> getAllHosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### IDENTITY-017: GET `/api/users/hosts/{accountId}`

- Browser: `/api/v1/admin/hosts/:accountId`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:105) — method `getHostDetail`.

```java
public ApiRequest<HostDetailResponse> getHostDetail(@PathVariable String accountId)
```

### IDENTITY-018: GET `/api/users/internal/{userId}/status`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:370) — method `checkUserStatus`.

```java
public ApiRequest<UserStatusResponese> checkUserStatus(@PathVariable String userId)
```

### IDENTITY-019: GET `/api/users/me`

- Browser: `/api/v1/me`
- Controller authorization: "hasAnyRole('USER', 'ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:141) — method `getMyInfo`.

```java
public ApiRequest<UserResponse> getMyInfo()
```

### IDENTITY-020: PUT `/api/users/me`

- Browser: `/api/v1/me`
- Controller authorization: "hasAnyRole('USER', 'ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:149) — method `updateMyInfo`.

```java
public ApiRequest<UserResponse> updateMyInfo(@RequestBody UserUpdateRequest userUpdateRequest)
```

### IDENTITY-021: POST `/api/users/me/avatar`

- Browser: `/api/v1/me/avatar`
- Controller authorization: "hasAnyRole('USER', 'HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:376) — method `uploadAvatar`.

```java
public ApiRequest<UserProfileResponse> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authorizationHeader)
```

### IDENTITY-022: GET `/api/users/me/enterprise-bank-account`

- Browser: `/api/v1/me/enterprise-bank-account`
- Controller authorization: "hasAnyRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:355) — method `getMyEnterpriseBankAccount`.

```java
public ApiRequest<BankAccountResponse> getMyEnterpriseBankAccount()
```

### IDENTITY-023: PUT `/api/users/me/enterprise-bank-account`

- Browser: `/api/v1/me/enterprise-bank-account`
- Controller authorization: "hasAnyRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:362) — method `updateMyEnterpriseBankAccount`.

```java
public ApiRequest<BankAccountResponse> updateMyEnterpriseBankAccount(@RequestBody @Valid BankAccountRequest dto)
```

### IDENTITY-024: GET `/api/users/me/enterprise-profile`

- Browser: `/api/v1/me/enterprise-profile`
- Controller authorization: "hasAnyRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:341) — method `getMyEnterpriseProfile`.

```java
public ApiRequest<EnterpriseProfileResponse> getMyEnterpriseProfile()
```

### IDENTITY-025: PUT `/api/users/me/enterprise-profile`

- Browser: `/api/v1/me/enterprise-profile`
- Controller authorization: "hasAnyRole('ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:348) — method `updateMyEnterpriseProfile`.

```java
public ApiRequest<EnterpriseProfileResponse> updateMyEnterpriseProfile(@RequestBody EnterpriseProfileRequest dto)
```

### IDENTITY-026: GET `/api/users/me/host-bank-account`

- Browser: `/api/v1/me/host-bank-account`
- Controller authorization: "hasAnyRole('HOST')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:327) — method `getMyHostBankAccount`.

```java
public ApiRequest<BankAccountResponse> getMyHostBankAccount()
```

### IDENTITY-027: PUT `/api/users/me/host-bank-account`

- Browser: `/api/v1/me/host-bank-account`
- Controller authorization: "hasAnyRole('HOST')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:334) — method `updateMyHostBankAccount`.

```java
public ApiRequest<BankAccountResponse> updateMyHostBankAccount(@RequestBody @Valid BankAccountRequest dto)
```

### IDENTITY-028: GET `/api/users/me/host-profile`

- Browser: `/api/v1/me/host-profile`
- Controller authorization: "hasAnyRole('HOST')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:313) — method `getMyHostProfile`.

```java
public ApiRequest<HostProfileResponse> getMyHostProfile()
```

### IDENTITY-029: PUT `/api/users/me/host-profile`

- Browser: `/api/v1/me/host-profile`
- Controller authorization: "hasAnyRole('HOST')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:320) — method `updateMyHostProfile`.

```java
public ApiRequest<HostProfileResponse> updateMyHostProfile(@RequestBody HostProfileRequest dto)
```

### IDENTITY-030: GET `/api/users/me/profile`

- Browser: `/api/v1/me/profile`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:299) — method `getMyProfile`.

```java
public ApiRequest<UserProfileResponse> getMyProfile()
```

### IDENTITY-031: PUT `/api/users/me/profile`

- Browser: `/api/v1/me/profile`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:306) — method `updateMyProfile`.

```java
public ApiRequest<UserProfileResponse> updateMyProfile(@RequestBody UserProfileRequest dto)
```

### IDENTITY-032: POST `/api/users/me/ticket-vendor-application`

- Browser: `/api/v1/me/ticket-vendor-application`
- Controller authorization: "hasRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:216) — method `applyToTicketVendor`.

```java
public ApiRequest<TicketVendorProfileResponse> applyToTicketVendor(
            @Valid @ModelAttribute TicketVendorApplicationRequest request,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage)
```

### IDENTITY-033: PUT `/api/users/me/ticket-vendor-application`

- Browser: `/api/v1/me/ticket-vendor-application`
- Controller authorization: "hasRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:227) — method `updateTicketVendorApplication`.

```java
public ApiRequest<TicketVendorProfileResponse> updateTicketVendorApplication(
            @Valid @ModelAttribute TicketVendorApplicationRequest request,
            @RequestParam(value = "frontImage", required = false) MultipartFile frontImage,
            @RequestParam(value = "backImage", required = false) MultipartFile backImage)
```

### IDENTITY-034: GET `/api/users/me/ticket-vendor-profile`

- Browser: `/api/v1/me/ticket-vendor-profile`
- Controller authorization: "hasRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:238) — method `getMyTicketVendorProfile`.

```java
public ApiRequest<TicketVendorProfileResponse> getMyTicketVendorProfile()
```

### IDENTITY-035: GET `/api/users/me/upgrade-applications`

- Browser: `/api/v1/me/upgrade-applications`
- Controller authorization: "hasAnyRole('USER', 'HOST', 'ENTERPRISE')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:209) — method `getMyUpgradeApplications`.

```java
public ApiRequest<UpgradeApplicationsResponse> getMyUpgradeApplications()
```

### IDENTITY-036: POST `/api/users/me/upgradetoenterprise`

- Browser: `/api/v1/me/upgrade-enterprise`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:284) — method `upgradeToEnterprise`.

```java
public ApiRequest<UserResponse> upgradeToEnterprise(@RequestBody EnterpriseProfileRequest enterpriseProfileRequest)
```

### IDENTITY-037: PUT `/api/users/me/upgradetoenterprise`

- Browser: `/api/v1/me/upgrade-enterprise`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:291) — method `updateUpgradeToEnterprise`.

```java
public ApiRequest<UserResponse> updateUpgradeToEnterprise(@RequestBody EnterpriseProfileRequest enterpriseProfileRequest)
```

### IDENTITY-038: DELETE `/api/users/me/upgradetohost`

- Browser: `/api/v1/me/upgrade-host`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:261) — method `deleteProfileUpgradeToHost`.

```java
public ApiRequest<ApprovalStatusResponse> deleteProfileUpgradeToHost()
```

### IDENTITY-039: POST `/api/users/me/upgradetohost`

- Browser: `/api/v1/me/upgrade-host`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:196) — method `upgradeToHost`.

```java
public ApiRequest<ApprovalStatusResponse> upgradeToHost(
            @ModelAttribute HostProfileRequest hostProfileRequest,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage)
```

### IDENTITY-040: PUT `/api/users/me/upgradetohost`

- Browser: `/api/v1/me/upgrade-host`
- Controller authorization: "hasAnyRole('USER')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:246) — method `updateUpgradeToHost`.

```java
public ApiRequest<ApprovalStatusResponse> updateUpgradeToHost(
            @ModelAttribute HostProfileRequest hostProfileRequest,
            @RequestParam(value = "frontImage", required = false) MultipartFile frontImage,
            @RequestParam(value = "backImage", required = false) MultipartFile backImage)
```

### IDENTITY-041: GET `/api/users/ticket-vendors`

- Browser: `/api/v1/admin/ticket-vendors`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:85) — method `getTicketVendorApplications`.

```java
public ApiRequest<PageResponse<UserResponse>> getTicketVendorApplications(
            @RequestParam(defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
```

### IDENTITY-042: PUT `/api/users/ticket-vendors/{accountId}/approval`

- Browser: `/api/v1/admin/ticket-vendors/:accountId/approval`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:95) — method `reviewTicketVendorApplication`.

```java
public ApiRequest<TicketVendorProfileResponse> reviewTicketVendorApplication(
            @PathVariable String accountId,
            @Valid @RequestBody ApprovalRequest request)
```

### IDENTITY-043: PUT `/api/users/{accountId}/approvalstatus`

- Browser: `/api/v1/admin/hosts/:accountId/approval`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:111) — method `approvalHostStatus`.

```java
public ApiRequest<Void> approvalHostStatus(
            @RequestParam String type,
            @PathVariable String accountId,
            @RequestBody ApprovalRequest request)
```

### IDENTITY-044: POST `/api/users/{id}/revokerole`

- Browser: `/api/v1/admin/users/:id/revokerole`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:189) — method `revokeRole`.

```java
public ApiRequest<String> revokeRole(@PathVariable String id, @RequestParam String role)
```

### IDENTITY-045: POST `/api/users/{id}/successupgradetoenterprise`

- Browser: `CHƯA THẤY ROUTE GATEWAY — cần nối, không gọi port service trực tiếp`
- Controller authorization: "hasAnyRole('ADMIN')"
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:277) — method `successUpgradeToEnterprise`.

```java
public ApiRequest<UserResponse> successUpgradeToEnterprise(@PathVariable String id)
```

### IDENTITY-046: POST `/api/users/{id}/successupgradetohost`

- Browser: `/api/v1/admin/hosts/:id/success`
- Controller authorization: "hasAnyRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:270) — method `successUpgradeToHost`.

```java
public ApiRequest<UserResponse> successUpgradeToHost(@PathVariable String id)
```

### IDENTITY-047: POST `/api/users/{id}/upgraderole`

- Browser: `/api/v1/admin/users/:id/role`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [UserController.java](/home/DoANLienNganh/Identity/src/main/java/com/gotravel/Identity/controller/UserController.java:182) — method `upgradeRole`.

```java
public ApiRequest<String> upgradeRole(@PathVariable String id,@RequestParam String role)
```

## inventory

### INVENTORY-001: PUT `/api/v1/internal/inventory/transport/item-operations/{action}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [ItemInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/ItemInventoryController.java:11) — method `apply`.

```java
public ApiResponse<ItemInventoryPort.Result> apply(@PathVariable String action,@RequestBody ItemInventoryPort.Command command)
```

### INVENTORY-002: GET `/api/v1/internal/inventory/transport/item-operations/{operationId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [ItemInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/ItemInventoryController.java:12) — method `get`.

```java
public ApiResponse<ItemInventoryPort.Result> get(@PathVariable UUID operationId)
```

### INVENTORY-003: PUT `/api/v1/internal/inventory/transport/orders/{orderId}/cancel-sold`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:84) — method `cancelSold`.

```java
public ResponseEntity<ApiResponse<Void>> cancelSold(@PathVariable UUID orderId)
```

### INVENTORY-004: PUT `/api/v1/internal/inventory/transport/orders/{orderId}/confirm`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:64) — method `confirm`.

```java
public ResponseEntity<ApiResponse<Void>> confirm(@PathVariable UUID orderId)
```

### INVENTORY-005: PUT `/api/v1/internal/inventory/transport/orders/{orderId}/release-unpaid`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:78) — method `releaseUnpaid`.

```java
public ResponseEntity<ApiResponse<Void>> releaseUnpaid(@PathVariable UUID orderId)
```

### INVENTORY-006: GET `/api/v1/internal/inventory/transport/orders/{orderId}/status`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:72) — method `orderStatus`.

```java
public ResponseEntity<ApiResponse<TransportInventoryService.HoldStatusView>> orderStatus(
            @PathVariable UUID orderId)
```

### INVENTORY-007: GET `/api/v1/internal/inventory/transport/orders/{orderId}/trips/{tripId}/seats/{seatId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:70) — method `seatOwnership`.

```java
public ApiResponse<TransportInventoryService.SeatOwnership> seatOwnership(@PathVariable UUID orderId,@PathVariable UUID tripId,@PathVariable UUID seatId)
```

### INVENTORY-008: PUT `/api/v1/internal/inventory/transport/trips/{tripId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:36) — method `initialize`.

```java
public ResponseEntity<ApiResponse<Void>> initialize(@PathVariable UUID tripId,
                                                         @RequestBody @Valid InitializeRequest request)
```

### INVENTORY-009: POST `/api/v1/internal/inventory/transport/trips/{tripId}/holds`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:58) — method `reserve`.

```java
public ResponseEntity<ApiResponse<TransportInventoryService.HoldResult>> reserve(
            @PathVariable UUID tripId, @RequestBody @Valid ReserveRequest request)
```

### INVENTORY-010: PUT `/api/v1/internal/inventory/transport/trips/{tripId}/sale-enabled`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:44) — method `setSaleEnabled`.

```java
public ResponseEntity<ApiResponse<TransportInventoryService.SaleStatusResult>> setSaleEnabled(
            @PathVariable UUID tripId,
            @RequestParam boolean enabled,
            @RequestParam int version)
```

### INVENTORY-011: PUT `/api/v1/internal/inventory/transport/trips/{tripId}/seat-blocks`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:29) — method `changeSeatBlock`.

```java
public ResponseEntity<ApiResponse<Void>> changeSeatBlock(@PathVariable UUID tripId,
            @RequestBody @Valid SeatBlockRequest request)
```

### INVENTORY-012: GET `/api/v1/internal/inventory/transport/trips/{tripId}/seats`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportInventoryController.java](/home/DoANLienNganh/BookingandInventory/src/main/java/com/Gostay/BookingandInventory/transport/presentation/TransportInventoryController.java:53) — method `seats`.

```java
public ResponseEntity<ApiResponse<List<TransportInventoryService.SeatView>>> seats(@PathVariable UUID tripId)
```

## payment

### PAYMENT-001: PUT `/api/v1/internal/payments/order/{orderId}/refund`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:29) — method `refundOrder`.

```java
public ResponseEntity<ApiResponse<Void>> refundOrder(
            @PathVariable UUID orderId,
            @RequestBody(required = false) RefundOrderRequest request)
```

### PAYMENT-002: GET `/api/v1/internal/payments/order/{orderId}/status`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:24) — method `getPaymentStatus`.

```java
public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentStatus(@PathVariable UUID orderId)
```

### PAYMENT-003: PUT `/api/v1/internal/payments/order/{orderId}/transport-manual-refund`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:79) — method `recordManualTransportRefund`.

```java
public ResponseEntity<ApiResponse<Void>> recordManualTransportRefund(
            @PathVariable UUID orderId, @RequestBody ManualTransportRefundRequest request)
```

### PAYMENT-004: PUT `/api/v1/internal/payments/transport/cash-refund-adjustments/{orderId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:70) — method `recordCashRefundAdjustment`.

```java
public ResponseEntity<ApiResponse<Void>> recordCashRefundAdjustment(@PathVariable UUID orderId,
            @RequestBody CashRefundAdjustmentRequest request)
```

### PAYMENT-005: PUT `/api/v1/internal/payments/transport/cash-settlements/{shiftId}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:61) — method `recordCashSettlement`.

```java
public ResponseEntity<ApiResponse<Void>> recordCashSettlement(@PathVariable UUID shiftId,
            @RequestBody CashSettlementRequest request)
```

### PAYMENT-006: GET `/api/v1/internal/payments/transport/cash-summary`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:45) — method `cashSummary`.

```java
public ResponseEntity<ApiResponse<PaymentService.CashSettlementSummary>> cashSummary(
            @RequestParam(required = false) UUID operatorId)
```

### PAYMENT-007: GET `/api/v1/internal/payments/transport/commission`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [InternalPaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/InternalPaymentController.java:40) — method `transportCommission`.

```java
public ResponseEntity<ApiResponse<PaymentService.TransportCommission>> transportCommission()
```

### PAYMENT-008: GET `/api/v1/internal/payments/transport/funds-report`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportFundsReportController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/transport/presentation/TransportFundsReportController.java:9) — method `report`.

```java
public ApiResponse<Map<String,Object>> report(@RequestParam(required=false)UUID ownerUserId,@RequestParam LocalDate from,@RequestParam LocalDate to)
```

### PAYMENT-009: PUT `/api/v1/internal/payments/transport/item-operations/{id}/{action}`

- Browser: `INTERNAL — trình duyệt không được gọi`
- Controller authorization: internal
- Source: [TransportItemMoneyController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/transport/presentation/TransportItemMoneyController.java:11) — method `apply`.

```java
public ApiResponse<Result> apply(@PathVariable UUID id,@PathVariable String action)
```

### PAYMENT-010: POST `/api/v1/payments/create`

- Browser: `/api/v1/payments/create`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:31) — method `createPayment`.

```java
public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreatePaymentRequest request,
            HttpServletRequest httpRequest)
```

### PAYMENT-011: POST `/api/v1/payments/create-mock`

- Browser: `/api/v1/payments/create-mock`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:39) — method `createMockPayment`.

```java
public ResponseEntity<ApiResponse<PaymentResponse>> createMockPayment(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid CreatePaymentRequest request)
```

### PAYMENT-012: GET `/api/v1/payments/history`

- Browser: `/api/v1/payments/history`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:68) — method `getPaymentHistory`.

```java
public ResponseEntity<ApiResponse<Page<PaymentResponse>>> getPaymentHistory(
            @RequestHeader("X-User-Id") UUID userId,
            Pageable pageable)
```

### PAYMENT-013: GET `/api/v1/payments/order/{orderId}`

- Browser: `/api/v1/payments/order/:orderId`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:61) — method `getPaymentByOrder`.

```java
public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID orderId)
```

### PAYMENT-014: GET `/api/v1/payments/{paymentId}`

- Browser: `/api/v1/payments/:paymentId`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:54) — method `getPayment`.

```java
public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID paymentId)
```

### PAYMENT-015: POST `/api/v1/payments/{paymentId}/mock-pay`

- Browser: `/api/v1/payments/:paymentId/mock-pay`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [PaymentController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/PaymentController.java:75) — method `mockPaymentSuccess`.

```java
public ResponseEntity<ApiResponse<Void>> mockPaymentSuccess(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID paymentId)
```

### PAYMENT-016: GET `/api/v1/payouts/admin/commission`

- Browser: `/api/v1/payouts/admin/commission`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:64) — method `getCommissionConfig`.

```java
public ResponseEntity<ApiResponse<CommissionConfigResponse>> getCommissionConfig()
```

### PAYMENT-017: PUT `/api/v1/payouts/admin/commission`

- Browser: `/api/v1/payouts/admin/commission`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:70) — method `updateCommissionConfig`.

```java
public ResponseEntity<ApiResponse<CommissionConfigResponse>> updateCommissionConfig(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody @Valid UpdateCommissionConfigRequest request)
```

### PAYMENT-018: GET `/api/v1/payouts/admin/revenue-report`

- Browser: `/api/v1/payouts/admin/revenue-report`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:56) — method `getRevenueReport`.

```java
public ResponseEntity<ApiResponse<AdminRevenueReportResponse>> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate)
```

### PAYMENT-019: GET `/api/v1/payouts/admin/summary`

- Browser: `/api/v1/payouts/admin/summary`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:50) — method `getAdminSummary`.

```java
public ResponseEntity<ApiResponse<AdminPaymentSummaryResponse>> getAdminSummary()
```

### PAYMENT-020: GET `/api/v1/payouts/all`

- Browser: `/api/v1/payouts/all`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:44) — method `getAllPayouts`.

```java
public ResponseEntity<ApiResponse<Page<HostPayoutResponse>>> getAllPayouts(Pageable pageable)
```

### PAYMENT-021: PUT `/api/v1/payouts/host/{hostId}/mark-paid`

- Browser: `/api/v1/payouts/host/:hostId/mark-paid`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:99) — method `markAllAsPaidByHost`.

```java
public ResponseEntity<ApiResponse<Void>> markAllAsPaidByHost(@PathVariable UUID hostId)
```

### PAYMENT-022: GET `/api/v1/payouts/me`

- Browser: `/api/v1/payouts/me`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:37) — method `getMyPayouts`.

```java
public ResponseEntity<ApiResponse<Page<HostPayoutResponse>>> getMyPayouts(
            @AuthenticationPrincipal Jwt jwt,
            Pageable pageable)
```

### PAYMENT-023: PUT `/api/v1/payouts/transport/cash-settlements/{shiftId}/mark-paid`

- Browser: `/api/v1/payouts/transport/cash-settlements/:shiftId/mark-paid`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportFinanceController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/TransportFinanceController.java:41) — method `markCashCommissionPaid`.

```java
public ResponseEntity<ApiResponse<Void>> markCashCommissionPaid(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID shiftId, @RequestBody @Valid CommissionPaidRequest request)
```

### PAYMENT-024: GET `/api/v1/payouts/transport/cash-summary`

- Browser: `/api/v1/payouts/transport/cash-summary`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [TransportFinanceController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/TransportFinanceController.java:30) — method `cashSummary`.

```java
public ResponseEntity<ApiResponse<PaymentService.CashSettlementSummary>> cashSummary(
            @RequestParam(required = false) UUID operatorId)
```

### PAYMENT-025: PUT `/api/v1/payouts/transport/{payoutId}/mark-paid`

- Browser: `/api/v1/payouts/transport/:payoutId/mark-paid`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:85) — method `markTransportPaid`.

```java
public ResponseEntity<ApiResponse<Void>> markTransportPaid(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID payoutId,@RequestBody TransportPayoutProof proof)
```

### PAYMENT-026: POST `/api/v1/payouts/transport/{payoutId}/withdraw`

- Browser: `/api/v1/payouts/transport/:payoutId/withdraw`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:78) — method `requestTransportWithdrawal`.

```java
public ResponseEntity<ApiResponse<HostPayoutResponse>> requestTransportWithdrawal(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID payoutId)
```

### PAYMENT-027: POST `/api/v1/payouts/withdraw`

- Browser: `/api/v1/payouts/withdraw`
- Controller authorization: "isAuthenticated()"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:106) — method `requestWithdrawal`.

```java
public ResponseEntity<ApiResponse<Void>> requestWithdrawal(@AuthenticationPrincipal Jwt jwt)
```

### PAYMENT-028: PUT `/api/v1/payouts/{payoutId}/mark-paid`

- Browser: `/api/v1/payouts/:payoutId/mark-paid`
- Controller authorization: "hasRole('ADMIN')"
- Gateway seed authorization: `jwt`; enabled=True.
- Source: [HostPayoutController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/HostPayoutController.java:92) — method `markAsPaid`.

```java
public ResponseEntity<ApiResponse<Void>> markAsPaid(@PathVariable UUID payoutId)
```

### PAYMENT-029: POST `/api/v1/public/payments/sepay-webhook`

- Browser: `CALLBACK — không gọi để giả lập thành công`
- Controller authorization: provider/server callback
- Source: [SepayWebhookController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/SepayWebhookController.java:35) — method `handleWebhook`.

```java
public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestBody byte[] rawBody,
            HttpServletRequest httpRequest
    )
```

### PAYMENT-030: GET `/api/v1/public/payments/vnpay/ipn`

- Browser: `CALLBACK — không gọi để giả lập thành công`
- Controller authorization: provider/server callback
- Source: [VnpayCallbackController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/VnpayCallbackController.java:23) — method `ipn`.

```java
public ResponseEntity<Map<String, String>> ipn(@RequestParam MultiValueMap<String, String> params)
```

### PAYMENT-031: GET `/api/v1/public/payments/vnpay/return`

- Browser: `CALLBACK — không gọi để giả lập thành công`
- Controller authorization: provider/server callback
- Source: [VnpayCallbackController.java](/home/DoANLienNganh/PaymentandWallet/src/main/java/com/gotravel/PaymentandWallet/controller/VnpayCallbackController.java:36) — method `result`.

```java
public ResponseEntity<ApiResponse<VnpayReturnResponse>> result(@RequestParam MultiValueMap<String, String> params)
```

## Node Media — browser API bổ sung ngoài inventory controller 260

Source: [media.routes.js](/home/DoANLienNganh/cloudinary-service/src/routes/media.routes.js), [upload.middleware.js](/home/DoANLienNganh/cloudinary-service/src/middlewares/upload.middleware.js), [media.controller.js](/home/DoANLienNganh/cloudinary-service/src/controllers/media.controller.js), [mediaOwnership.js](/home/DoANLienNganh/cloudinary-service/src/utils/mediaOwnership.js).

| Method/path | Body | `data`/scope |
|---|---|---|
| POST `/api/v1/media/upload` | FormData `file`; optional `folder` | `{url,publicId,resourceType,folder,ownerId}`; public image jpg/jpeg/png/webp, ≤10 MiB |
| POST `/api/v1/media/upload/bulk` | FormData repeated `files`; optional `folder` | `{url:[...],publicIds:[...],resourceTypes:[...],folder,ownerId}`; ≤10 files, each ≤10 MiB |
| POST `/api/v1/media/upload/secure-documents` | FormData repeated `files` | `{urls,documentIds}`; ≤2 files jpeg/png/webp, each ≤10 MiB; TICKET_VENDOR không được secure upload |
| DELETE `/api/v1/media` | JSON `{publicId,resourceType?,deliveryType?}` | Ownership enforced; resourceType image/video/raw, deliveryType upload/private |

JWT session qua Gateway, CSRF, credentials include; FormData không đặt Content-Type. TICKET_VENDOR namespace `transport/{userId}/{requestedFolder}` do server cấp. Identity KYC dùng frontImage/backImage endpoint riêng, không tráo thành Media secure route. Internal email/communications không có browser action phát hành vé hoặc gửi mail tự do.

## Lưu ý operator application legacy và G9

Các route GoCar `/operator-applications/**` trong inventory là luồng local đang tồn tại. Controller signature không chứng minh Identity approval/role đã đồng bộ: module bind use cases tạo/duyệt local, approve tạo Operator nhưng không gọi Identity. Website mới dùng Identity KYC; provision Operator sau approval là backend dependency G9 trong plan. Không triển khai hai màn duyệt độc lập rồi coi hoàn thành onboarding. API sau khi nối phải cập nhật inventory và màn U11/A02.
