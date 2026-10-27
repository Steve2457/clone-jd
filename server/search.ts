// Product types are curated catalog data, separate from the broad navigation categories.
// Accessory searches remain literal: searching 手机散热器 must not select phone handsets.
export function searchIntent(query: string) {
  const keyword = query.normalize("NFKC").trim().slice(0, 100);
  const categoryAliases: Record<string, string> = {
    数码: "digital",
    手机数码: "digital",
    图书: "books",
    书籍: "books",
    家用电器: "appliance",
    汽车用品: "auto",
  };
  const category = categoryAliases[keyword.replace(/[\s/]+/g, "")];
  const phoneWord = /智能手机|手机整机|手机|智能机|smartphones?/gi;
  const accessory =
    /配件|手机壳|保护壳|保护套|手机套|贴膜|钢化膜|手机膜|支架|散热|充电|数据线|耳机|云台|稳定器|自拍|投屏|投影|维修|转接|挂绳|背夹|贴纸|防尘|清洁|摄像头/i;
  const handset =
    !category &&
    /智能手机|手机整机|手机|智能机|smartphones?/i.test(keyword) &&
    !accessory.test(keyword);
  const text = category
    ? ""
    : handset
      ? keyword.replace(phoneWord, " ")
      : keyword;
  return {
    keyword,
    category,
    productType: handset ? "mobile_phone" : undefined,
    tokens: text.split(/\s+/).filter(Boolean),
  };
}

export const likePattern = (token: string) =>
  "%" + token.replace(/[\\%_]/g, "\\$&") + "%";
