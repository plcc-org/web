// src/data/homePageImages.ts
// Images from public/images/ with configurable tags for categorization
// Tags can include: worship, kids, family, community, service, social, gathering, care, generosity, etc.

export interface HomePageImage {
  filename: string
  tags: string[]
  alt?: string
}

export function getImagesByAnyTag(tags: string[]): HomePageImage[] {
  if (tags.length === 0) {
    return []
  }

  return homePageImages.filter((image) => image.tags.some((tag) => tags.includes(tag)))
}

export function pickImageByAnyTag(tags: string[], excludeFilenames: string[] = []): HomePageImage | undefined {
  const matches = getImagesByAnyTag(tags).filter((image) => !excludeFilenames.includes(image.filename))

  if (matches.length === 0) {
    return undefined
  }

  const randomIndex = Math.floor(Math.random() * matches.length)
  return matches[randomIndex]
}

export function imagePublicSrc(filename: string): string {
  return `${import.meta.env.BASE_URL}images/${encodeURIComponent(filename)}`
}

export function imageAlt(image: HomePageImage, fallback: string): string {
  if (image.alt && image.alt.trim().length > 0) {
    return image.alt
  }

  return fallback
}

export const homePageImages: HomePageImage[] = [
  { filename: '463487542_18145527859338056_2415919883470249546_n.jpg', tags: ['worship'], alt: '' },
  { filename: '467977252_18149338267338056_1889842660921052110_n.jpg', tags: ['church'], alt: '' },
  { filename: '468021140_18149338252338056_8213645161142400436_n.jpg', tags: ['teaching', 'sermon', 'becca'], alt: '' },
  { filename: '473716270_18155064727338056_2658407046026869686_n.jpg', tags: ['community', 'cross', 'prayer'], alt: '' },
  { filename: '474002348_18156359122338056_2617337075326128263_n.jpg', tags: ['teaching', 'pastor', 'sermon'], alt: '' },
  { filename: '474748731_1030392515795404_2521947271930024728_n.jpg', tags: ['informal', 'family', 'social'], alt: '' },
  { filename: '475891141_1037080631793259_4238958896521856436_n.jpg', tags: ['baptism', 'becca', 'mark'], alt: '' },
  { filename: '476750093_18157384759338056_1921287384410502360_n.jpg', tags: ['prayer', 'service', 'care'], alt: '' },
  { filename: '479169157_18157955926338056_118133880266586215_n.jpg', tags: ['kids', 'activity'], alt: '' },
  { filename: '479179583_18157955881338056_4628131170118472796_n.jpg', tags: ['social'], alt: '' },
  { filename: '489054059_18163289533338056_8029010570585607191_n.jpg', tags: ['worship'], alt: '' },
  { filename: '489452970_18163289524338056_7813091187862021243_n.jpg', tags: ['social'], alt: '' },
  { filename: '491449602_18165174925338056_899800155995143027_n.jpg', tags: ['prayer', 'family', 'kyle'], alt: '' },
  { filename: '495938178_18165842899338056_2078248515916983250_n.jpg', tags: ['kids'], alt: '' },
  { filename: '496764399_18166032214338056_8744828942491316308_n.jpg', tags: ['kids', 'social', 'event'], alt: '' },
  { filename: '499237357_18167175172338056_6041845435208425322_n.jpg', tags: ['community', 'kids'], alt: '' },
  { filename: '500083306_18167175181338056_8168148552855409791_n.jpg', tags: ['social', 'gathering'], alt: '' },
  { filename: '503632641_18168464443338056_6100866002216681684_n.jpg', tags: ['kids', 'food'], alt: '' },
  { filename: '504494257_18168761794338056_1316832317120676381_n.jpg', tags: ['service'], alt: '' },
  { filename: '514258192_1153019166866071_3757453336252701624_n.jpg', tags: ['worship', 'kyle'], alt: '' },
  { filename: '515010876_1159769626191025_3703366804227887968_n.jpg', tags: ['prayer', 'service'], alt: '' },
  { filename: '518004827_1167866172048037_6008137444107196335_n.jpg', tags: ['kids'], alt: '' },
  { filename: '519488408_1167866085381379_7669252600761441309_n.jpg', tags: ['worship', 'service'], alt: '' },
  { filename: '519628769_1167866182048036_7190694217326787178_n.jpg', tags: ['social'], alt: '' },
  { filename: '524154872_18173482963338056_6782375928921851070_n.jpg', tags: ['social'], alt: '' },
  { filename: '527569106_18174174304338056_1814989299414124937_n.jpg', tags: ['service'], alt: '' },
  { filename: '527613266_18174174280338056_1626054179180271796_n.jpg', tags: ['prayer'], alt: '' },
  { filename: '528705489_18174174331338056_8249332813782505474_n.jpg', tags: ['prayer', 'service'], alt: '' },
  { filename: '539390246_18176284939338056_330744351158099611_n.jpg', tags: ['kids', 'service'], alt: '' },
  { filename: '551096105_18178844185338056_8945047004848009463_n.jpg', tags: ['community', 'social'], alt: '' },
  { filename: '551447661_18178844206338056_8896943485236580927_n.jpg', tags: ['social'], alt: '' },
  { filename: '587395483_18187772734338056_5738413555925055591_n.jpg', tags: ['youth'], alt: '' },
  { filename: '612510663_18192015196338056_7796982445441955951_n.jpg', tags: ['communion', 'wine'], alt: '' },
  { filename: '624779024_18194108401338056_4396479470413009307_n.jpg', tags: ['generosity', 'valentine'], alt: '' },
  { filename: '629657481_18195175345338056_5505037084301337851_n.jpg', tags: ['communion', 'austin'], alt: '' },
  { filename: '630141203_18195791974338056_6787714522898086321_n.jpg', tags: ['worship'], alt: '' },
  { filename: '649105057_18197705947338056_7727010854774354017_n.jpg', tags: ['youth', 'worship'], alt: '' },
  { filename: '649105057_18197705983338056_1797927855377785235_n.jpg', tags: ['social', 'gathering'], alt: '' },
  { filename: '649217566_18197705956338056_8287619439099906475_n.jpg', tags: ['service'], alt: '' },
  { filename: '650251601_18198219286338056_7378060351620760269_n.jpg', tags: ['youth'], alt: '' },
  { filename: '651028798_18198219313338056_1071593068697817126_n.jpg', tags: ['kids', 'becca'], alt: '' },
  { filename: '659061814_18200889997338056_7806695594506990174_n.jpg', tags: ['palm', 'worship'], alt: '' },
  { filename: '659595691_18200889961338056_2843340499663516152_n.jpg', tags: ['kids', 'gathering'], alt: '' },
  {
    filename: 'plcc-community-family-worship.jpg',
    tags: ['community', 'family', 'worship', 'gathering'],
    alt: 'Adults and a baby gathered in worship together at Pine Lake',
  },
  {
    filename: 'plcc-kids-storytime-stage.jpg',
    tags: ['kids', 'family', 'gathering', 'teaching'],
    alt: 'Children listening during a kids moment at the front of the room',
  },
  {
    filename: 'plcc-worship-harp.jpg',
    tags: ['worship', 'music', 'service'],
    alt: 'A musician singing beside a harp during worship',
  },
  {
    filename: 'plcc-prayer-candles.jpg',
    tags: ['prayer', 'care', 'reflection'],
    alt: 'Lit candles set out for a reflective prayer moment',
  },
  {
    filename: 'plcc-community-worship-cross.jpg',
    tags: ['community', 'worship', 'gathering'],
    alt: 'People standing together in worship beneath the cross',
  },
  {
    filename: 'plcc-worship-vocals.jpg',
    tags: ['worship', 'music', 'service'],
    alt: 'A vocalist leading worship on stage',
  },
  {
    filename: 'plcc-kids-stage-gathering.jpg',
    tags: ['kids', 'family', 'gathering', 'community'],
    alt: 'Children gathered together up front during a church activity',
  },
  { filename: 'cropped-Worship-e1464544420127.jpg', tags: [], alt: '' },
  { filename: 'worship-1600x400.jpg', tags: ['service'], alt: '' },
]
