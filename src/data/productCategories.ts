export type ProductMenuChild = {
  label: string;
  href: string;
  slug: string;
  legacyPath: string;
};

export type ProductMenuGroup = {
  label: string;
  href: string;
  slug: string;
  legacyPath: string;
  children: ProductMenuChild[];
};

export const directProductLinks: ProductMenuChild[] = [
  { label: '首頁', href: '/', slug: 'home', legacyPath: '/' },
  {
    label: '求婚戒指',
    href: '/categories/womens-diamond-rings/engagement-rings/',
    slug: 'engagement-rings',
    legacyPath: '/collections/求婚'
  },
  {
    label: '結婚對戒',
    href: '/categories/other-jewelry/pair-rings/',
    slug: 'pair-rings',
    legacyPath: '/collections/pair-ring'
  }
];

export const productMenuGroups: ProductMenuGroup[] = [
  {
    label: '女士鑽戒',
    href: '/categories/womens-diamond-rings/',
    slug: 'womens-diamond-rings',
    legacyPath: '/collections/ring-female',
    children: [
      {
        label: '經典女戒',
        href: '/categories/womens-diamond-rings/classic-womens-rings/',
        slug: 'classic-womens-rings',
        legacyPath: '/collections/經典女戒'
      },
      {
        label: '轉運女戒',
        href: '/categories/womens-diamond-rings/fortune-womens-rings/',
        slug: 'fortune-womens-rings',
        legacyPath: '/collections/轉運女戒'
      }
    ]
  },
  {
    label: '男士鑽戒',
    href: '/categories/mens-diamond-rings/',
    slug: 'mens-diamond-rings',
    legacyPath: '/collections/ring-man',
    children: [
      {
        label: '經典男戒',
        href: '/categories/mens-diamond-rings/classic-mens-rings/',
        slug: 'classic-mens-rings',
        legacyPath: '/collections/經典男戒'
      },
      {
        label: '轉運男戒',
        href: '/categories/mens-diamond-rings/fortune-mens-rings/',
        slug: 'fortune-mens-rings',
        legacyPath: '/collections/轉運男戒'
      }
    ]
  },
  {
    label: '時尚珠寶',
    href: '/categories/other-jewelry/',
    slug: 'other-jewelry',
    legacyPath: '',
    children: [
      { label: '項鍊', href: '/categories/other-jewelry/necklaces/', slug: 'necklaces', legacyPath: '/collections/necklace' },
      { label: '耳環', href: '/categories/other-jewelry/earrings/', slug: 'earrings', legacyPath: '/collections/earring' },
      { label: '手鍊', href: '/categories/other-jewelry/bracelets/', slug: 'bracelets', legacyPath: '/collections/bracelet' }
    ]
  },
  {
    label: '彩色鑽石專區',
    href: '/categories/colored-diamonds/',
    slug: 'colored-diamonds',
    legacyPath: '/collections/彩色鑽石專區',
    children: [
      { label: '黃鑽', href: '/categories/colored-diamonds/yellow-diamonds/', slug: 'yellow-diamonds', legacyPath: '/collections/黃鑽' },
      { label: '粉鑽', href: '/categories/colored-diamonds/pink-diamonds/', slug: 'pink-diamonds', legacyPath: '/collections/粉鑽' },
      { label: '藍鑽', href: '/categories/colored-diamonds/blue-diamonds/', slug: 'blue-diamonds', legacyPath: '/collections/藍鑽' }
    ]
  }
];

export const standaloneProductLinks: ProductMenuChild[] = [
  {
    label: '精選裸鑽',
    href: '/categories/loose-diamonds/',
    slug: 'loose-diamonds',
    legacyPath: '/collections/diamond'
  }
];

export const primaryCategoryLabels: Record<string, string> = {
  'womens-diamond-rings': '女士鑽戒',
  'mens-diamond-rings': '男士鑽戒',
  'colored-diamonds': '彩色鑽石專區',
  'loose-diamonds': '精選裸鑽',
  'other-jewelry': '時尚珠寶'
};

export const subcategoryLabels: Record<string, string> = {
  'engagement-rings': '求婚戒指',
  'classic-womens-rings': '經典女戒',
  'fortune-womens-rings': '轉運女戒',
  'classic-mens-rings': '經典男戒',
  'fortune-mens-rings': '轉運男戒',
  necklaces: '項鍊',
  earrings: '耳環',
  bracelets: '手鍊',
  'pair-rings': '結婚對戒',
  'yellow-diamonds': '黃鑽',
  'pink-diamonds': '粉鑽',
  'blue-diamonds': '藍鑽'
};

export const legacyCollectionRoutes: Record<string, string> = {
  求婚: '/categories/womens-diamond-rings/engagement-rings/',
  'pair-ring': '/categories/other-jewelry/pair-rings/',
  'ring-female': '/categories/womens-diamond-rings/',
  經典女戒: '/categories/womens-diamond-rings/classic-womens-rings/',
  轉運女戒: '/categories/womens-diamond-rings/fortune-womens-rings/',
  'ring-man': '/categories/mens-diamond-rings/',
  經典男戒: '/categories/mens-diamond-rings/classic-mens-rings/',
  轉運男戒: '/categories/mens-diamond-rings/fortune-mens-rings/',
  necklace: '/categories/other-jewelry/necklaces/',
  earring: '/categories/other-jewelry/earrings/',
  bracelet: '/categories/other-jewelry/bracelets/',
  彩色鑽石專區: '/categories/colored-diamonds/',
  黃鑽: '/categories/colored-diamonds/yellow-diamonds/',
  粉鑽: '/categories/colored-diamonds/pink-diamonds/',
  藍鑽: '/categories/colored-diamonds/blue-diamonds/',
  diamond: '/categories/loose-diamonds/'
};

export function getCategoryLabel(slug?: string) {
  if (!slug) return '';
  return primaryCategoryLabels[slug] ?? subcategoryLabels[slug] ?? slug;
}
