export type KnowledgeCategory = {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  legacyUrls: string[];
  displayOrder: number;
  articleCount: number;
  seoTitle: string;
  seoDescription: string;
  source: string;
  status: 'active' | 'inactive';
};

export const knowledgeCategories: KnowledgeCategory[] = [
  {
    "categoryId": "KCAT-001",
    "name": "求婚選鑽指南",
    "slug": "proposal-guide",
    "description": "原站求婚選鑽文章，包含求婚戒、克拉、戒台、戒圍與訂製流程。",
    "seoTitle": "Proposal Guide｜VELORIA知識學堂",
    "seoDescription": "VELORIA求婚選鑽指南，整理求婚戒、克拉、戒台、戒圍與訂製流程。",
    "displayOrder": 1,
    "articleCount": 6,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  },
  {
    "categoryId": "KCAT-002",
    "name": "款式搭配指南",
    "slug": "style-guide",
    "description": "原站風格挑選文章，包含黃鑽搭配、手型比例與預算風格選擇。",
    "seoTitle": "Style Guide｜VELORIA知識學堂",
    "seoDescription": "VELORIA風格指南，整理黃鑽搭配、手型比例與鑽戒款式選擇。",
    "displayOrder": 2,
    "articleCount": 3,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  },
  {
    "categoryId": "KCAT-003",
    "name": "鑽石知識",
    "slug": "diamond-knowledge",
    "description": "原站鑽石知識文章，包含彩色鑽石、圓鑽、水滴型鑽石與切工火光。",
    "seoTitle": "Diamond Knowledge｜VELORIA知識學堂",
    "seoDescription": "VELORIA鑽石知識，整理彩鑽、圓鑽、水滴型鑽石、切工與火光。",
    "displayOrder": 3,
    "articleCount": 3,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  },
  {
    "categoryId": "KCAT-004",
    "name": "鑽石挑選指南",
    "slug": "diamond-guide",
    "description": "原站鑽石挑選指南，包含切工、彩鑽與天然鑽石、培育鑽石比較。",
    "seoTitle": "Diamond Guide｜VELORIA知識學堂",
    "seoDescription": "VELORIA鑽石挑選指南，整理切工、彩鑽、天然鑽石與培育鑽石。",
    "displayOrder": 4,
    "articleCount": 3,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  },
  {
    "categoryId": "KCAT-005",
    "name": "珠寶保養",
    "slug": "jewelry-care",
    "description": "原站珠寶日常配戴與保養文章，包含水滴型鑽戒配戴注意事項。",
    "seoTitle": "Jewelry Care｜VELORIA知識學堂",
    "seoDescription": "VELORIA珠寶保養指南，整理鑽戒日常配戴、清潔與維護注意事項。",
    "displayOrder": 5,
    "articleCount": 1,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  },
  {
    "categoryId": "KCAT-006",
    "name": "鑽戒清潔保養",
    "slug": "diamond-care-guide",
    "description": "原站鑽戒清潔與保養文章，包含居家清潔、日常維護與回店檢查。",
    "seoTitle": "Diamond Care Guide｜VELORIA知識學堂",
    "seoDescription": "VELORIA鑽戒保養指南，整理鑽戒清潔、日常保養與檢修建議。",
    "displayOrder": 6,
    "articleCount": 1,
    "legacyUrls": [
      "/blogs/diamond-symphony-guide"
    ],
    "source": "Live original site article migration",
    "status": "active"
  }
] as KnowledgeCategory[];

export const knowledgeHome = {
  title: 'VELORIA知識學堂',
  description: '以原站文章內容整理鑽石知識、求婚選鑽、風格挑選與珠寶保養指南。',
  seoTitle: 'VELORIA知識學堂｜鑽石、求婚戒指與珠寶保養指南',
  seoDescription: 'VELORIA知識學堂完整收錄原站鑽石知識、求婚選鑽、風格指南與珠寶保養文章。'
};

export function getKnowledgeCategory(slug: string) {
  return knowledgeCategories.find((category) => category.slug === slug);
}

export function getKnowledgeCategoryName(slug: string) {
  return getKnowledgeCategory(slug)?.name ?? slug;
}
