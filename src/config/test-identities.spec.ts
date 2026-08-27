import { TEST_IDENTITIES } from './test-identities';
import { Role } from '../common/enums/role.enum';

describe('TEST_IDENTITIES', () => {
  it('cubre exactamente los roles del modulo', () => {
    expect(Object.keys(TEST_IDENTITIES).sort()).toEqual(Object.values(Role).sort());
  });

  it('usa ids distintos por rol', () => {
    const ids = Object.values(TEST_IDENTITIES).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
