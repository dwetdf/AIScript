// ============================================================================
// ID 生成器 — character_id / location_id / beat_id 生成 (F61)
// 使用完整的中文→拼音映射表，保证确定性
// ============================================================================

const PINYIN_MAP: Record<string, string> = {
  '张': 'zhang','李': 'li','王': 'wang','刘': 'liu','陈': 'chen','杨': 'yang','赵': 'zhao','黄': 'huang',
  '周': 'zhou','吴': 'wu','徐': 'xu','孙': 'sun','马': 'ma','朱': 'zhu','胡': 'hu','郭': 'guo',
  '何': 'he','高': 'gao','林': 'lin','罗': 'luo','郑': 'zheng','梁': 'liang','谢': 'xie',
  '宋': 'song','唐': 'tang','许': 'xu','韩': 'han','冯': 'feng','邓': 'deng','曹': 'cao',
  '彭': 'peng','曾': 'zeng','肖': 'xiao','田': 'tian','董': 'dong','潘': 'pan','袁': 'yuan',
  '蔡': 'cai','蒋': 'jiang','余': 'yu','杜': 'du','叶': 'ye','程': 'cheng','苏': 'su',
  '魏': 'wei','任': 'ren','沈': 'shen','姚': 'yao','卢': 'lu','姜': 'jiang','崔': 'cui',
  '钟': 'zhong','谭': 'tan','汪': 'wang','范': 'fan','石': 'shi','廖': 'liao','贾': 'jia',
  '夏': 'xia','韦': 'wei','傅': 'fu','方': 'fang','白': 'bai','倪': 'ni','阿': 'a',
  '一': 'yi','二': 'er','三': 'san','四': 'si','五': 'wu','六': 'liu','七': 'qi','八': 'ba','九': 'jiu','十': 'shi',
  '小': 'xiao','大': 'da','文': 'wen','明': 'ming','华': 'hua','伟': 'wei','强': 'qiang',
  '敏': 'min','静': 'jing','丽': 'li','花': 'hua','安': 'an','子': 'zi','美': 'mei',
  '秀': 'xiu','英': 'ying','芳': 'fang','洁': 'jie','玲': 'ling','军': 'jun','建': 'jian',
  '国': 'guo','志': 'zhi','海': 'hai','春': 'chun','秋': 'qiu','冬': 'dong',
  '敬': 'jing','思': 'si','远': 'yuan','君': 'jun','卿': 'qing',
  '冰': 'bing','雪': 'xue','霜': 'shuang','雷': 'lei','风': 'feng','云': 'yun','雨': 'yu',
  '天': 'tian','地': 'di','人': 'ren','心': 'xin','龙': 'long','虎': 'hu','飞': 'fei',
  '玉': 'yu','珠': 'zhu','宝': 'bao','金': 'jin','银': 'yin','铜': 'tong','铁': 'tie',
  '荣': 'rong','贵': 'gui','富': 'fu','寿': 'shou','永': 'yong','恒': 'heng',
  '逸': 'yi','宁': 'ning','平': 'ping','承': 'cheng','继': 'ji',
  '之': 'zhi','也': 'ye','然': 'ran','如': 'ru','若': 'ruo','非': 'fei',
  '不': 'bu','为': 'wei','此': 'ci','彼': 'bi','以': 'yi',
  '好': 'hao','善': 'shan','仁': 'ren','义': 'yi','忠': 'zhong','孝': 'xiao',
  '正': 'zheng','直': 'zhi','刚': 'gang','柔': 'rou','新': 'xin','旧': 'jiu',
  '深': 'shen','浅': 'qian','长': 'chang','短': 'duan','低': 'di',
  '上': 'shang','下': 'xia','左': 'zuo','右': 'you','前': 'qian','后': 'hou',
  '出': 'chu','入': 'ru','来': 'lai','去': 'qu','开': 'kai','关': 'guan',
  '东': 'dong','南': 'nan','西': 'xi','北': 'bei','中': 'zhong',
  '未': 'wei','已': 'yi','将': 'jiang','在': 'zai','有': 'you',
  '滨': 'bin','川': 'chuan','山': 'shan','水': 'shui',
  '狼': 'lang','狐': 'hu','兔': 'tu','鸟': 'niao','鱼': 'yu',
  '官': 'guan','司': 'si','府': 'fu','殿': 'dian','堂': 'tang',
  '皇': 'huang','帝': 'di','相': 'xiang',
  '兵': 'bing','帅': 'shuai','士': 'shi',
  '道': 'dao','佛': 'fo','圣': 'sheng','仙': 'xian','魔': 'mo',
  '剑': 'jian','刀': 'dao','枪': 'qiang','箭': 'jian',
  '勇': 'yong','敢': 'gan','死': 'si','活': 'huo','战': 'zhan',
  '红': 'hong','赤': 'chi','青': 'qing','蓝': 'lan',
  '黑': 'hei','绿': 'lv','紫': 'zi',
  '暗': 'an','光': 'guang','影': 'ying',
  '书': 'shu','笔': 'bi','墨': 'mo','纸': 'zhi',
  '琴': 'qin','画': 'hua','乐': 'yue',
  '起': 'qi','落': 'luo','行': 'xing','止': 'zhi','动': 'dong',
  '晓': 'xiao','暮': 'mu','旦': 'dan','夕': 'xi',
  '看': 'kan','见': 'jian','听': 'ting','闻': 'wen',
  '问': 'wen','答': 'da','说': 'shuo','言': 'yan','语': 'yu',
  '笑': 'xiao','哭': 'ku','怒': 'nu','喜': 'xi','悲': 'bei',
  '城': 'cheng','树': 'shu','草': 'cao','木': 'mu','屋': 'wu',
  '暖': 'nuan','冷': 'leng','凉': 'liang','热': 're',
  '常': 'chang','吉': 'ji','庆': 'qing','福': 'fu',
  '生': 'sheng','名': 'ming','年': 'nian','月': 'yue','日': 'ri','时': 'shi',
  '主': 'zhu','老': 'lao','师': 'shi','学': 'xue','校': 'xiao','家': 'jia',
  '口': 'kou','头': 'tou','手': 'shou','足': 'zu','目': 'mu','身': 'shen','体': 'ti',
  '工': 'gong','作': 'zuo','用': 'yong','可': 'ke','能': 'neng','会': 'hui','要': 'yao',
  '对': 'dui','自': 'zi','己': 'ji','们': 'men',
  '多': 'duo','少': 'shao','真': 'zhen','假': 'jia','实': 'shi','空': 'kong',
  '想': 'xiang','知': 'zhi','觉': 'jue','感': 'gan','情': 'qing','爱': 'ai',
  '力': 'li','气': 'qi','神': 'shen','色': 'se','声': 'sheng','音': 'yin',
  '快': 'kuai','慢': 'man','进': 'jin','退': 'tui','回': 'hui',
  '火': 'huo','烟': 'yan','酒': 'jiu','饭': 'fan','菜': 'cai','肉': 'rou',
  '门': 'men','路': 'lu','车': 'che','船': 'chuan','桥': 'qiao',
  '果': 'guo','根': 'gen','种': 'zhong',
  '眼': 'yan','耳': 'er','鼻': 'bi','嘴': 'zui','牙': 'ya',
  '泌': 'bi','宾': 'bin','靖': 'jing','汝': 'ru','呆': 'dai',
  '脚': 'jiao','卵': 'luan','斌': 'bin',
  '車': 'che','亂': 'luan','插': 'cha','隊': 'dui',
  '吃': 'chi','餓': 'e','饅': 'man','頭': 'tou',
  '蛇': 'she','母': 'mu','親': 'qin','父': 'fu','妹': 'mei',
  '贏': 'ying','輸': 'shu','冠': 'guan','軍': 'jun','賽': 'sai',
  '故': 'gu','字': 'zi','磨': 'mo',
  '楚': 'chu','漢': 'han','界': 'jie','場': 'chang',
  '庖': 'pao','丁': 'ding','牛': 'niu',
  '是': 'shi','我': 'wo','他': 'ta','她': 'ta','您': 'nin','這': 'zhe','那': 'na',
  '個': 'ge','什': 'shen','麼': 'me','怎': 'zen','嗎': 'ma','呢': 'ne','吧': 'ba',
  '過': 'guo','著': 'zhe','了': 'le','都': 'dou',
  '很': 'hen','就': 'jiu','才': 'cai','又': 'you','再': 'zai',
  '從': 'cong','到': 'dao','把': 'ba','被': 'bei','給': 'gei','讓': 'rang',
  '跟': 'gen','和': 'he','與': 'yu','或': 'huo','但': 'dan','而': 'er',
  '沒': 'mei','只': 'zhi','最': 'zui','更': 'geng','比': 'bi',
  '因': 'yin','於': 'yu','由': 'you',
  '後': 'hou','裡': 'li','面': 'mian','邊': 'bian','外': 'wai','處': 'chu','間': 'jian',
  '太': 'tai','極': 'ji','幾': 'ji','些': 'xie','點': 'dian','半': 'ban',
  '做': 'zuo','走': 'zou','跑': 'pao','站': 'zhan','坐': 'zuo','躺': 'tang',
  '拿': 'na','放': 'fang','打': 'da','寫': 'xie','讀': 'du',
  '講': 'jiang','話': 'hua','叫': 'jiao','喊': 'han','唱': 'chang',
  '住': 'zhu','睡': 'shui','醒': 'xing','忘': 'wang',
  '胖': 'pang','瘦': 'shou','難': 'nan','易': 'yi',
  '怕': 'pa','苦': 'ku','甜': 'tian','酸': 'suan',
  '雙': 'shuang','盤': 'pan',
  '殺': 'sha','結': 'jie','束': 'shu','閉': 'bi',
  '應': 'ying','還': 'hai','請': 'qing','幫': 'bang','找': 'zhao',
  '朋': 'peng','友': 'you','同': 'tong','學': 'xue',
  '買': 'mai','賣': 'mai','錢': 'qian','便': 'bian',
  '宜': 'yi','整': 'zheng',
  '先': 'xian','突': 'tu','忽': 'hu','緊': 'jin',
  '圍': 'wei','經': 'jing','炮': 'pao','卒': 'zu',
  '盲': 'mang','枰': 'ping','格': 'ge','譜': 'pu','局': 'ju',
};

function toSnakeCase(name: string): string {
  const cleaned = name.replace(/[^一-鿿]/g, '');
  if (!cleaned) return 'unknown';
  const parts: string[] = [];
  for (const char of cleaned) {
    parts.push(PINYIN_MAP[char] || stableSyllable(char.charCodeAt(0)));
  }
  if (parts.length > 4) return parts.slice(parts.length - 4).join('_');
  return parts.join('_');
}

function stableSyllable(code: number): string {
  const s = ['a','an','ba','bi','bo','ca','ci','da','di','du','e','en','fa','fei','ga','ge','ha','he','hu','ji','ka','ke','la','li','lu','ma','mi','mo','na','ni','pa','pi','qi','ra','ri','ru','sa','si','su','ta','ti','tu','wa','wu','xi','xu','ya','yi','yu','za','ze','zi','zu'];
  return s[code % s.length] || 'an';
}

export function generateBeatId(ep: number, act: number, scene: number, beat: number): string {
  return `E${ep}A${act}S${scene}B${beat}`;
}

export function generateCharacterId(name: string): string {
  return toSnakeCase(name).toLowerCase();
}

export function generateLocationId(name: string): string {
  return toSnakeCase(name).toLowerCase();
}
