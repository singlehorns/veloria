import { directProductLinks, productMenuGroups, standaloneProductLinks } from './productCategories';

export type SiteNavItem = {
  label: string;
  href: string;
  children?: SiteNavItem[];
};

export const site = {
  name: 'VELORIA DIAMOND SYMPHONY',
  shortName: 'VELORIA',
  description: 'VELORIA提供天然鑽石與實驗室培育鑽石首飾，包含求婚鑽戒、結婚對戒、女士鑽戒、男士鑽戒、時尚珠寶、彩色鑽石與裸鑽選品。',
  url: 'https://www.dsdiamond.com.tw',
  lineUrl: 'https://line.me/R/ti/p/@252flmie/',
  instagramUrl: 'https://www.instagram.com/zuanzhiyun/',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61565776509572',
  reservationUrl: 'https://m.me/61565776509572',
  email: 'zuanzhiyun60@gmail.com',
  phone: '02-27791005',
  hours: '11:00 ~ 19:00 (店休週日)',
  address: '台北旗艦門市-敦化南路一段 160 巷 11 號',
  taxId: '00243191'
};

export const knowledgeLandingPath = '/blogs/diamond-symphony-guide/round-diamond-engagement-ring-guide/';

export const productNavItems: SiteNavItem[] = [
  ...directProductLinks.filter((item) => item.slug !== 'home'),
  ...productMenuGroups.map((group) => ({
    label: group.label,
    href: group.href,
    children: group.children
  })),
  ...standaloneProductLinks
];

export const navItems: SiteNavItem[] = [
  { label: '首頁', href: '/' },
  { label: '全部商品', href: '/products/', children: productNavItems },
  { label: '知識專欄', href: knowledgeLandingPath },
  { label: '尊榮定製', href: '/pages/custom-service/' },
  { label: '關於我們', href: '/pages/about-us/' },
  { label: '常見問題FAQ', href: '/pages/qna/' }
];

export const collectionSummaries = [
  {
    name: '求婚戒指',
    slug: 'proposal',
    englishName: 'Proposal Rings',
    summary: '以鑽戒承載真摯承諾，從主石、戒台到配戴比例，協助找到適合求婚時刻的作品。',
    image: '/assets/jewelry/golden-vow-ring.jpeg',
    href: '/categories/womens-diamond-rings/engagement-rings/'
  },
  {
    name: '彩色鑽石專區',
    slug: 'color-diamond',
    englishName: 'Color Diamonds',
    summary: '黃鑽、粉鑽與藍鑽作品，呈現獨特色彩與個人風格。',
    image: '/assets/jewelry/celestial-bloom-ring.jpeg',
    href: '/categories/colored-diamonds/'
  },
  {
    name: '精選裸鑽',
    slug: 'diamond',
    englishName: 'Selected Loose Diamonds',
    summary: '以 4C、證書與預算需求協助挑選裸鑽，適合求婚、紀念與客製設計。',
    image: '/assets/banners/atelier-service-banner.jpeg',
    href: '/categories/loose-diamonds/'
  }
];

export const featuredProducts = [
  {
    name: 'Golden Vow',
    zhName: '金色誓約',
    collection: '求婚戒指',
    image: '/assets/jewelry/golden-vow-ring.jpeg',
    href: '/products/golden-vow/',
    description: '以溫潤金色線條襯托主鑽光芒，適合日常配戴與重要承諾。'
  },
  {
    name: 'Celestial Bloom',
    zhName: '星瀾綻放',
    collection: '彩色鑽石專區',
    image: '/assets/jewelry/celestial-bloom-ring.jpeg',
    href: '/products/celestial-bloom/',
    description: '藍色方鑽與細緻花葉線條交織，呈現沉靜而閃耀的彩鑽氣質。'
  }
];

