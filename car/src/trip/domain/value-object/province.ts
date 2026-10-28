import { PROVINCES } from './provinces';

export const provinceKey = (value: string) => value.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .replace(/\b(thanh pho|tinh|province|municipality|city|tp)\b/g, '').replace(/[^a-z0-9]/g, '');
const canonical = new Map(PROVINCES.map(name => [provinceKey(name), name]));
// Compatibility for existing routes using city names instead of the GoStay province label.
const aliases: Record<string, string> = {
  hcm: 'TP. Hồ Chí Minh', saigon: 'TP. Hồ Chí Minh', hochiminhmunicipality: 'TP. Hồ Chí Minh',
  hanoi: 'Hà Nội', hue: 'Thừa Thiên Huế', nhatrang: 'Khánh Hòa', camranh: 'Khánh Hòa',
  dalat: 'Lâm Đồng', baoloc: 'Lâm Đồng', vinh: 'Nghệ An', vungtau: 'Bà Rịa - Vũng Tàu',
  quynhon: 'Bình Định', hoian: 'Quảng Nam', halong: 'Quảng Ninh', 
  sapa: 'Lào Cai', phuquoc: 'Kiên Giang', rachgia: 'Kiên Giang', buonmathuot: 'Đắk Lắk',
  bienhoa: 'Đồng Nai', phanthiet: 'Bình Thuận', muine: 'Bình Thuận', tuyhoa: 'Phú Yên',
  donghoi: 'Quảng Bình', tamky: 'Quảng Nam', mytho: 'Tiền Giang', caolanh: 'Đồng Tháp',
};
export function resolveProvince(value?: string | null): string | undefined {
  if (!value) return undefined;
  const key = provinceKey(value);
  return canonical.get(key) || aliases[key];
}
