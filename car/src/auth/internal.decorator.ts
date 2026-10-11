import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ROUTE = 'internalRoute';
export const Internal = () => SetMetadata(INTERNAL_ROUTE, true);
