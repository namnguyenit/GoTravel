# Skill: Clean Architecture + DDD Front-End Architecture (React + TypeScript)

## 1. Mục tiêu & Tổng quan

Tài liệu này quy định kiến trúc chuẩn **Clean Architecture kết hợp Domain-Driven Design (DDD)** dành cho dự án Front-End (React + TypeScript).

Mỗi tính năng/nghiệp vụ trong ứng dụng front-end được đóng gói thành một module độc lập trong thư mục `src/modules/[module_name]/`.

---

## 2. Cấu trúc Thư mục Module (`src/modules/[module_name]/`)

```text
src/modules/[module_name]/
├── domain/                  # 1. Domain Layer: Nghiệp vụ cốt lõi (Entities, Value Objects, Domain Rules)
│   ├── entity/              # Domain Entity (pure TS class / interface)
│   └── repository/          # Contract Repository (Interface dữ liệu domain)
│
├── application/             # 2. Application Layer: Operations, Ports & API Services
│   ├── port/                # Hợp đồng (Contract interfaces cho Service & UseCase)
│   └── service/             # Cài đặt Hợp đồng (Implementation thực hiện các cuộc gọi API Gateway)
│
├── infrastructure/          # 3. Infrastructure Layer: Hạ tầng kỹ thuật (HTTP Client, Storage Adapters)
│   ├── http/                # Fetch / Axios Adapters
│   └── storage/             # LocalStorage / SessionStorage Adapters
│
├── composition/             # 4. Composition Layer: Chứa đồng thời Factory & Shared Single Instance
│   ├── index.ts             # Export Factory và Single Instance (carService & ModuleFactory)
│   └── provider/            # (Tùy chọn) React Provider chia sẻ Instance cho UI
│
└── presentation/            # 5. Presentation Layer: Giao diện người dùng
    ├── components/          # UI Components dùng lại
    ├── pages/               # Trang hiển thị (View Pages)
    ├── hooks/               # Custom Hooks tương tác qua Contract
    └── layout/              # Khung bố cục giao diện
```

---

## 3. Quy tắc Phụ thuộc (Dependency Direction & Layer Rules)

Sơ đồ hướng phụ thuộc giữa các lớp:

```text
Presentation Layer (UI Pages, Components, Hooks)
       │
       ├────► (Mặc định: Import Single Instance dùng chung từ Composition)
       └────► (Đặc biệt: Gọi Factory từ Composition khi cần new instance riêng)
       ▼
Composition Layer (Chứa cả Factory & Shared Single Instance)
       │                                  │
       │ (implements & type check)        │ (implements)
       ▼                                  ▼
Application Ports (Contracts) ◄─── Application Services (API Calls)
       │
       ▼ (chỉ phụ thuộc Domain)
 Domain Layer ◄────────────────── Infrastructure Layer
```

### Các nguyên tắc bắt buộc:

1. **Domain Layer**:
   - **Độc lập tuyệt đối**. Không cần biết bất kỳ lớp nào khác ngoài chính bản thân nó.
   - Không chứa bất kỳ thư viện UI (React, Redux) hay thư viện bên ngoài nào.
   - Chứa Business Rules, Entities và Value Objects của nghiệp vụ.

2. **Application Layer**:
   - Chứa `port/` (Định nghĩa hợp đồng / Contracts) và `service/` (Nơi triển khai hợp đồng và trực tiếp thực hiện các cuộc gọi API Gateway).
   - **CẤM KHÔNG ĐƯỢC** biết `presentation` và `infrastructure`.
   - Chỉ phụ thuộc vào `domain` và các hợp đồng trong `application/port/`.

3. **Infrastructure Layer**:
   - Nơi triển khai các bộ thích ứng kỹ thuật (HTTP Client Wrapper, Storage Adapters, Cache) nếu cần.
   - Implement các interface được định nghĩa ở `domain` hoặc `application`.

4. **Composition Layer (ĐỒNG THỜI CÓ FACTORY VÀ SINGLE INSTANCE)**:
   - **Shared Single Instance (Mặc định sử dụng)**: Composition khởi tạo sẵn 1 Instance dùng chung và ép kiểu theo Contract Interface. Presentation sẽ import và dùng instance này mặc định để tránh `new` lại nhiều lần.
   - **Factory (Sử dụng khi thực sự cần thiết)**: Giữ lớp Factory (ví dụ `CarModuleFactory`) để khởi tạo instance mới khi có nhu cầu đặc biệt (ví dụ: cần override base URL, token riêng, hoặc isolated context cho multi-tenant/unit tests).

5. **Presentation Layer**:
   - Chứa toàn bộ giao diện: Pages, Components, Layouts, Hooks.
   - **Mặc định**: Import Single Instance do Composition export (ví dụ `import { carService } from '../../composition'`).
   - **Khi cần trường hợp đặc biệt**: Sử dụng Factory từ Composition (ví dụ `CarModuleFactory.createCarService(customConfig)`).
   - **QUY TẮC VÀNG**: Cấm tự `new` trực tiếp class Service cài đặt trong Presentation (`new CarService()`). Mọi khởi tạo đều phải qua Composition.

---

## 4. Chi tiết triển khai Mã nguồn (Code Examples)

### 4.1 Domain Layer (`src/modules/car/domain/`)

`domain/entity/car.entity.ts`:
```typescript
export interface CarProps {
  id: string;
  name: string;
  brand?: string;
  licensePlate: string;
  seatCapacity: number;
  pricePerTrip?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export class CarEntity {
  constructor(private props: CarProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get licensePlate(): string { return this.props.licensePlate; }
  get seatCapacity(): number { return this.props.seatCapacity; }
  get pricePerTrip(): number | undefined { return this.props.pricePerTrip; }
  get status(): string { return this.props.status; }

  // Business Rule: Kiểm tra xe có đủ điều kiện vận hành chuyến đường dài không
  public isReadyForTrip(): boolean {
    return this.props.status === 'ACTIVE' && this.props.seatCapacity >= 4;
  }
}
```

---

### 4.2 Application Layer (`src/modules/car/application/`)

`application/port/car.service.interface.ts` **(Contract / Hợp đồng)**:
```typescript
import type { CarEntity } from '../../domain/entity/car.entity';

export interface GetCarsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCarDTO {
  name: string;
  brand?: string;
  licensePlate: string;
  seatCapacity: number;
  pricePerTrip?: number;
}

// Contract mà Presentation hoặc bên ngoài sẽ sử dụng
export interface ICarService {
  getCars(params?: GetCarsParams): Promise<{ data: CarEntity[]; totalPages: number }>;
  getCarById(id: string): Promise<CarEntity>;
  createCar(dto: CreateCarDTO): Promise<CarEntity>;
}
```

`application/service/car.service.ts` **(Implementation gọi API)**:
```typescript
import type { ICarService, GetCarsParams, CreateCarDTO } from '../port/car.service.interface';
import { CarEntity } from '../../domain/entity/car.entity';

export class CarService implements ICarService {
  constructor(private readonly apiBaseUrl: string) {}

  async getCars(params?: GetCarsParams): Promise<{ data: CarEntity[]; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${this.apiBaseUrl}/api/v1/cars?${query.toString()}`);
    if (!res.ok) throw new Error('Không thể tải danh sách xe');

    const json = await res.json();
    const cars = (json.data || []).map((item: any) => new CarEntity(item));

    return { data: cars, totalPages: json.totalPages || 1 };
  }

  async getCarById(id: string): Promise<CarEntity> {
    const res = await fetch(`${this.apiBaseUrl}/api/v1/cars/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy thông tin xe');
    const item = await res.json();
    return new CarEntity(item);
  }

  async createCar(dto: CreateCarDTO): Promise<CarEntity> {
    const res = await fetch(`${this.apiBaseUrl}/api/v1/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Thêm xe thất bại');
    const item = await res.json();
    return new CarEntity(item);
  }
}
```

---

### 4.3 Composition Layer (`src/modules/car/composition/`)

`composition/index.ts` **(Đồng thời xuất Factory và Single Instance dùng chung)**:
```typescript
import type { ICarService } from '../application/port/car.service.interface';
import { CarService } from '../application/service/car.service';

const GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:5555';

/**
 * 1. Factory Pattern:
 * Dùng khi cần tạo instance mới với cấu hình/token riêng biệt (Sử dụng khi thực sự cần)
 */
export class CarModuleFactory {
  public static createCarService(customBaseUrl?: string): ICarService {
    return new CarService(customBaseUrl || GATEWAY_URL);
  }
}

/**
 * 2. Shared Single Instance (Mặc định):
 * Instance dùng chung được tạo sẵn 1 lần duy nhất từ Factory.
 * Presentation sẽ import và dùng trực tiếp instance này mặc định.
 */
export const carService: ICarService = CarModuleFactory.createCarService();
```

---

### 4.4 Presentation Layer (`src/modules/car/presentation/`)

#### Trường hợp 1: Sử dụng Mặc định (Single Instance dùng chung)

`presentation/pages/CarListPage.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import type { CarEntity } from '../../domain/entity/car.entity';

// 1. MẶC ĐỊNH: Import Single Instance được tạo sẵn từ Composition
import { carService } from '../../composition';

export const CarListPage: React.FC = () => {
  const [cars, setCars] = useState<CarEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Dùng trực tiếp instance duy nhất mà không new lại
    carService.getCars()
      .then((res) => setCars(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Đang tải danh sách xe...</div>;

  return (
    <div>
      <h1>Danh sách Xe khách</h1>
      <ul>
        {cars.map((car) => (
          <li key={car.id}>{car.name} - {car.licensePlate} ({car.seatCapacity} ghế)</li>
        ))}
      </ul>
    </div>
  );
};
```

#### Trường hợp 2: Sử dụng Trường hợp Đặc biệt (Gọi Factory khi cần Instance riêng)

`presentation/pages/SpecialCarPage.tsx`:
```typescript
import React from 'react';
// 2. ĐẶC BIỆT: Import Factory từ Composition khi cần cấu hình riêng biệt
import { CarModuleFactory } from '../../composition';

export const SpecialCarPage: React.FC = () => {
  // Tạo instance riêng khi có nhu cầu đặc biệt (ví dụ custom gateway URL)
  const customCarService = CarModuleFactory.createCarService('http://custom-gateway:5555');

  const handleFetch = async () => {
    const data = await customCarService.getCars();
    console.log('Custom instance cars:', data);
  };

  return <button onClick={handleFetch}>Tải dữ liệu qua Custom Service</button>;
};
```

---

## 5. Bảng Quy tắc Import và Kiểm tra Vi phạm (Checklist)

| Lớp (Layer) | Được phép Import | CẤM Import | Quy tắc về Instantiation |
| :--- | :--- | :--- | :--- |
| **Domain** | Chỉ import nội bộ `domain/` | `application`, `infrastructure`, `composition`, `presentation` | Không dùng external dependencies |
| **Application** | `domain/`, `application/port/` | `presentation/`, `infrastructure/` | Không tự `new` adapter ngoài |
| **Infrastructure** | `domain/`, `application/port/` | `presentation/` | Chịu trách nhiệm thích ứng kỹ thuật |
| **Composition** | `application/port/`, `application/service/`, `infrastructure/` | `presentation/` | **Nơi duy nhất chứa Factory và Single Instance đại diện** |
| **Presentation** | `domain/`, `application/port/` (Contracts), `composition/` (`carService` hoặc `CarModuleFactory`) | **CẤM import trực tiếp class từ `application/service/`** | **Mặc định dùng Single Instance. CẤM tự `new` class Service trực tiếp.** |
