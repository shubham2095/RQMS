const dayjs = require('dayjs');

// Poore (completed) months — jis din-of-month par shuru hua wo din aaye bina month poora nahi maana jata.
// Jan 15 -> Feb 14 = 0 months, Feb 15 = 1 month. Month-end dates (31 wagairah) conservative rahti hain.
function completedMonths(from, asOf = new Date()) {
  if (!from) return 0;
  const start = dayjs(from);
  const end = dayjs(asOf);
  let months = (end.year() - start.year()) * 12 + (end.month() - start.month());
  if (end.date() < start.date()) months -= 1;
  return Math.max(0, months);
}

// Poore service years (date_of_joining se). Date na ho ya future ho to 0.
function completedYears(from, asOf = new Date()) {
  return Math.floor(completedMonths(from, asOf) / 12);
}

module.exports = { completedMonths, completedYears };
