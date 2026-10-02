import { interpretationChips } from '../interpretationChips';

describe('interpretationChips', () => {
  it('turns what search understood into readable, removable chips', () => {
    const chips = interpretationChips({
      category: 'shoes',
      brandName: 'Nike',
      color: 'red',
      gender: 'men',
      maxPrice: 3000,
      terms: 'running',
      source: 'rules',
    });
    expect(chips).toEqual([
      { key: 'category', label: 'Shoes' },
      { key: 'brand', label: 'Nike' },
      { key: 'color', label: 'Red' },
      { key: 'gender', label: 'Men' },
      { key: 'price', label: 'Under PKR 3,000' },
    ]);
  });

  it('labels price ranges and floors', () => {
    expect(interpretationChips({ minPrice: 1500, maxPrice: 4000 })).toEqual([{ key: 'price', label: 'PKR 1,500–4,000' }]);
    expect(interpretationChips({ minPrice: 2000 })).toEqual([{ key: 'price', label: 'Over PKR 2,000' }]);
  });

  it('leaves out the brand chip inside a storefront, where the store is the brand filter', () => {
    expect(interpretationChips({ brandName: 'Gul Ahmed', color: 'red' }, { scopedToBrand: true })).toEqual([
      { key: 'color', label: 'Red' },
    ]);
  });

  it('has nothing to show for plain text or no interpretation', () => {
    expect(interpretationChips({ terms: 'lawn' })).toEqual([]);
    expect(interpretationChips(null)).toEqual([]);
  });
});
