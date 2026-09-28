/**
 * 销量 / 价格格式化
 */
/** 23000 -> '2.3万' */
function formatSales(n) {
  if (n >= 10000) {
    const v = (n / 10000).toFixed(1).replace(/\.0$/, '');
    return v + '万';
  }
  return String(n);
}

/** 129 -> { symbol: '¥', integer: '129', decimal: '' } */
function splitPrice(p) {
  const s = Number(p).toFixed(2);
  const [integer, decimal] = s.split('.');
  return {
    symbol: '¥',
    integer,
    decimal: decimal === '00' ? '' : '.' + decimal
  };
}

module.exports = {
  formatSales,
  splitPrice
};
