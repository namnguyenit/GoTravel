import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ROUTE = 'internalRoute';
export const Internal = (allowedCallers: string[] = ['cart']) =>
  SetMetadata(INTERNAL_ROUTE, allowedCallers);
