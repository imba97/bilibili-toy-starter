// filepath: src/mock/data.ts
//
// 业务专属 mock 数据：假用户池、假视频、假头像等。
//
// 设计原则：
//   - 数据要"看起来像真的"：头像 URL、昵称、签名都成型，BV 号遵循 B 站格式
//   - 数量适中（榜单 10 人 / 视频 8 条）：既能展示列表样式，又不会让 mock 文件臃肿
//   - 全是稳定生成（同 mid 永远得到同一条），便于测试断言
//   - 默认用户（mid === MOCK_DEFAULT_USER_ID）走"我"的真实数据，便于本地预览辨识
//
// 这是「业务侧的资产」，不属于通用 SDK。SDK 内的 mock/store.ts 只提供
// store 容器和持久化骨架（那是 SDK 基础设施），数据由业务方决定。

// MOCK_DEFAULT_USER_ID 来自 bilibili-toy（store 模块导出），保持 SDK 作为
// mock 基础设施、业务作为 mock 内容的边界。
import { MOCK_DEFAULT_USER_ID } from 'bilibili-toy'

/** 假用户池（榜单用） */
export interface MockUser {
  mid: number
  nickname: string
  avatar: string
  score: number
}

/** "我"的头像（开发期间统一使用，方便一眼辨识 mock 数据中的自己） */
export const MOCK_SELF_AVATAR =
  'https://p0.hdslb.com/bfs/face/c61af953b4b10d931e70d63e2b571e6e374b1a37.jpg'
/** "我"的昵称 */
export const MOCK_SELF_NICKNAME = 'imba久期'
/** "我"的个性签名（AuthorProfile.sign 必填，前端未展示但必须存在） */
export const MOCK_SELF_SIGN = '一个前端'

const NICKNAMES = [
  '半夜追番的咕咕',
  '奶茶三分糖',
  '代码写一半',
  '像素战士',
  '今天的砖好烫',
  '一觉醒来赢了',
  '签到是一种态度',
  '番茄炒蛋不放糖',
  '咸鱼本鱼',
  '散步去月球',
  'Ctrl+Z 救命',
  '不想起床的第7天'
]

const SIGNS = [
  '摸鱼中',
  '今天也想休息',
  '别 @我',
  '正在加载灵感',
  '这签名是 mock 出来的',
  '已签到 / 比昨天更菜',
  '低头捡六便士',
  'emo 中'
]

function avatarFor(mid: number): string {
  // mock 用户头像：使用 placehold.co 生成带 mid 的占位图（保证可访问 + 视觉辨识）。
  // 这里不引用 hdslb.com/bfs/face/mock_xxx.jpg —— 官方 CDN 上根本没这些图，会 404。
  return `https://placehold.co/120x120/4f9cf9/ffffff?text=${mid}`
}

/**
 * Mock 榜单的「其他人池」。
 *
 * 设计原则：真实 SDK 下其他人分数与"我"无关，不会随"我"分数浮动而改变。
 * 这里给 12 个固定 mid（10..21），分数从 30 递减到 17，凑齐一个稳定排行榜。
 * 「我」的排名由真实 ci_total 决定 —— 排不进前 10 就不会出现在 list 里，
 * 真实名次通过 me() 给出（顶部横幅展示）。不要为了让"我"挤进榜而调低分数。
 */
const MOCK_OTHERS: MockUser[] = [
  { mid: 10, nickname: NICKNAMES[0], avatar: avatarFor(10), score: 30 },
  { mid: 11, nickname: NICKNAMES[1], avatar: avatarFor(11), score: 28 },
  { mid: 12, nickname: NICKNAMES[2], avatar: avatarFor(12), score: 26 },
  { mid: 13, nickname: NICKNAMES[3], avatar: avatarFor(13), score: 25 },
  { mid: 14, nickname: NICKNAMES[4], avatar: avatarFor(14), score: 24 },
  { mid: 15, nickname: NICKNAMES[5], avatar: avatarFor(15), score: 23 },
  { mid: 16, nickname: NICKNAMES[6], avatar: avatarFor(16), score: 22 },
  { mid: 17, nickname: NICKNAMES[7], avatar: avatarFor(17), score: 21 },
  { mid: 18, nickname: NICKNAMES[8], avatar: avatarFor(18), score: 20 },
  { mid: 19, nickname: NICKNAMES[9], avatar: avatarFor(19), score: 19 },
  { mid: 20, nickname: NICKNAMES[10], avatar: avatarFor(20), score: 18 },
  { mid: 21, nickname: NICKNAMES[11], avatar: avatarFor(21), score: 17 }
]

/** 返回其他人池（外部只读）。 */
export function getMockOthers(): readonly MockUser[] {
  return MOCK_OTHERS
}

/**
 * 生成 mock 当前用户资料。
 * 调用方传 mid；mid 等于"我"的 mid 时返回真实数据，否则走通用 mock。
 */
export function buildMockUserProfile(mid: number): ToySDK.UserProfileResp {
  if (mid === MOCK_DEFAULT_USER_ID) {
    return {
      nickname: MOCK_SELF_NICKNAME,
      avatar: MOCK_SELF_AVATAR,
      toyOpenId: `mock_open_${mid}`
    }
  }
  return {
    nickname: NICKNAMES[mid % NICKNAMES.length],
    avatar: avatarFor(mid),
    toyOpenId: `mock_open_${mid}`
  }
}

/**
 * 生成 mock 作者资料（rich 版本，用于 author.profile）。
 * mid 等于"我"的 mid 时返回真实数据。
 */
export function buildMockAuthorProfile(mid: number): ToySDK.AuthorProfileResp {
  if (mid === MOCK_DEFAULT_USER_ID) {
    return {
      status: 'ok',
      data: {
        nickname: MOCK_SELF_NICKNAME,
        avatar: MOCK_SELF_AVATAR,
        sign: MOCK_SELF_SIGN,
        following: 23,
        follower: 156,
        archiveCount: 12,
        certification: { role: 1, title: '知名 UP 主', description: 'mock 认证', type: 1 },
        charging: { count: 5, display: { show: true } }
      }
    }
  }
  return {
    status: 'ok',
    data: {
      nickname: NICKNAMES[mid % NICKNAMES.length],
      avatar: avatarFor(mid),
      sign: SIGNS[mid % SIGNS.length],
      following: 23 + (mid % 100),
      follower: 156 + ((mid * 7) % 9999),
      archiveCount: 12 + (mid % 40),
      certification:
        mid % 5 === 0
          ? { role: 1, title: '知名 UP 主', description: 'mock 认证', type: 1 }
          : undefined,
      charging: { count: 5 + (mid % 50), display: { show: true } }
    }
  }
}

/**
 * 生成 mock 作者视频列表。
 * vid 数固定 count（默认 8）；aid / bvid 由 mid + index 派生。
 */
export function buildMockAuthorVideos(mid: number, count = 8): ToySDK.AuthorVideosResp {
  const items: ToySDK.AuthorVideoItem[] = Array.from({ length: count }, (_, i) => {
    const aid = mid * 100 + i
    const bvid = `BV1mock${String(aid).padStart(8, '0')}`
    return {
      ref: { aid },
      status: 'ok',
      data: {
        aid,
        bvid,
        title: `Mock 视频 #${i + 1}`,
        cover: `https://placehold.co/480x270/222831/eeeeee?text=Mock%20%23${i + 1}`,
        description: '这是一条 mock 视频，用于本地开发预览。',
        publishTime: Date.now() - (count - i) * 86400000,
        duration: 60 + ((i * 37) % 600),
        partition: '生活',
        pages: [{ page: 1, title: '正片', duration: 60 + ((i * 37) % 600) }],
        stat: {
          view: 1000 + ((aid * 13) % 99999),
          like: 50 + ((aid * 7) % 999),
          coin: 10 + ((aid * 3) % 99),
          favorite: 20 + ((aid * 5) % 999),
          share: 5 + (aid % 50),
          comment: 30 + ((aid * 11) % 999),
          danmaku: 80 + ((aid * 17) % 9999)
        },
        pay: { chargingPay: false, paid: false }
      }
    }
  })
  return { status: 'ok', items }
}

/**
 * 生成 mock 作者互动关系。
 */
export function buildMockAuthorRelation(mid: number): ToySDK.AuthorRelationResp {
  return {
    status: 'ok',
    data: {
      isFollowing: mid % 3 !== 0,
      isAuthor: false,
      isOldFan: mid % 7 === 0,
      hasFanMedal: mid % 2 === 0,
      fanMedalName: '咕咕勋章',
      fanMedalLevel: 1 + (mid % 20),
      isFanMedalActive: true,
      isCharging: mid % 5 === 0
    }
  }
}
