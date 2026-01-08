import { SetMetadata } from '@nestjs/common';

export enum UserType {
  HITACHI = 'HITACHI',
  PENGELOLA = 'PENGELOLA',
  BANK = 'BANK',
}

export const ROLES_KEY = 'roles';
export const USER_TYPE_KEY = 'userType';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const AllowUserTypes = (...types: UserType[]) => SetMetadata(USER_TYPE_KEY, types);

