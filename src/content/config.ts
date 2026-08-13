import { defineCollection, z } from 'astro:content';

const knowledge = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    subcategories: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    coverImage: z.string(),
    coverImageAlt: z.string(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    canonicalUrl: z.string().optional(),
    originalUrl: z.string().optional(),
    legacyUrl: z.string().optional(),
    legacySource: z.string().optional(),
    migrationStatus: z.string().optional(),
    migrationNotes: z.string().optional()
  })
});

const products = defineCollection({
  type: 'data',
  schema: z.object({
    legacyProductId: z.string().optional(),
    legacyCyberbizId: z.string().optional(),
    name: z.string(),
    englishName: z.string().optional(),
    originalDisplayName: z.string().optional(),
    slug: z.string(),
    legacyUrls: z.array(z.string()).default([]),
    collection: z.string(),
    collections: z.array(z.string()).optional(),
    category: z.string(),
    primaryCategory: z.string().optional(),
    collectionSlugs: z.array(z.string()).default([]),
    subcategories: z.array(z.string()).default([]),
    productType: z.string().optional(),
    audience: z.string().optional(),
    diamondType: z.string().optional(),
    variantType: z.string().optional(),
    parentProductId: z.string().optional(),
    material: z.string().default(''),
    mainStone: z.string().default(''),
    sideStone: z.string().optional(),
    diamondShape: z.string().optional(),
    shape: z.string().optional(),
    color: z.string().optional(),
    description: z.string(),
    shortDescription: z.string(),
    specifications: z.string().optional(),
    shippingDescription: z.string().optional(),
    productDetailSections: z.array(z.object({
      title: z.string(),
      settingName: z.string().optional(),
      html: z.string().default('')
    })).default([]),
    pricingStandards: z.object({
      source: z.string().optional(),
      materialStatement: z.string().default(''),
      naturalDiamond: z.string().default(''),
      labDiamond: z.string().default(''),
      notes: z.array(z.string()).default([])
    }).optional(),
    variants: z.array(z.object({
      variantId: z.string(),
      sku: z.string().optional(),
      name: z.string().optional(),
      optionName: z.string().optional(),
      price: z.number().nullable().optional(),
      compareAtPrice: z.number().nullable().optional(),
      currency: z.string().optional(),
      inventoryStatus: z.string().optional()
    })).default([]),
    priceMin: z.number().nullable().optional(),
    priceMax: z.number().nullable().optional(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      role: z.string().optional(),
      originalUrl: z.string().optional(),
      sourcePath: z.string().optional(),
      sha256: z.string().optional()
    })),
    displayPrice: z.string().optional(),
    video: z.string().optional(),
    featured: z.boolean().default(false),
    certificate: z.string().optional(),
    inquiryText: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    canonicalUrl: z.string().optional(),
    originalUrl: z.string().optional(),
    originalSource: z.string().optional(),
    frameworkStatus: z.string().optional(),
    contentStatus: z.string().optional(),
    imageStatus: z.string().optional(),
    mediaStatus: z.string().optional(),
    routeStatus: z.string().optional(),
    overallStatus: z.string().optional(),
    migrationStatus: z.string().optional(),
    sourceIds: z.array(z.string()).default([]),
    sourceFiles: z.array(z.string()).default([]),
    rawSources: z.array(z.object({
      sourceType: z.string(),
      sourceId: z.string().optional(),
      sourceFile: z.string().optional(),
      text: z.string().optional()
    })).default([]),
    migrationNotes: z.string().optional()
    ,
    tags: z.array(z.string()).default([]),
    legacyCategoryUrls: z.array(z.string()).default([]),
    taxonomyStatus: z.string().optional(),
    taxonomyNotes: z.string().optional(),
    productPageSourceStatus: z.string().optional()
  })
});

const pages = defineCollection({
  type: 'data',
  schema: z.object({
    pageId: z.string(),
    title: z.string(),
    slug: z.string(),
    legacyUrl: z.string(),
    pageType: z.string(),
    metaDescription: z.string().optional(),
    canonical: z.string().optional(),
    headings: z.object({
      h1: z.array(z.string()).default([]),
      h2: z.array(z.string()).default([]),
      h3: z.array(z.string()).default([])
    }),
    contentBlocks: z.array(z.object({
      blockOrder: z.number(),
      blockType: z.string(),
      title: z.string().optional(),
      text: z.string().optional(),
      imageSource: z.string().optional(),
      status: z.string().optional()
    })).default([]),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string().optional(),
      title: z.string().optional(),
      sourceType: z.string().optional()
    })).default([]),
    links: z.array(z.object({
      href: z.string(),
      text: z.string().optional(),
      type: z.string().optional()
    })).default([]),
    videos: z.array(z.object({
      src: z.string(),
      sourceType: z.string().optional()
    })).default([]),
    schema: z.array(z.string()).default([]),
    sourceFiles: z.array(z.string()).default([]),
    migrationStatus: z.string(),
    notes: z.array(z.string()).default([])
  })
});

const jewelryCollections = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    englishName: z.string(),
    summary: z.string(),
    description: z.string(),
    heroImage: z.object({ src: z.string(), alt: z.string() }),
    products: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    originalUrl: z.string().optional(),
    originalSource: z.string().optional(),
    migrationStatus: z.string().optional(),
    migrationNotes: z.string().optional()
  })
});

export const collections = { knowledge, products, collections: jewelryCollections, pages };
