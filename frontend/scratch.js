const chart_data = [{date: '2026-08-01', price: 100}, {date: '2026-08-03', price: 105}, {date: '2026-08-05', price: 110}];
const event_date = '2026-08-03';
const eventDate = new Date(event_date).getTime();
const dayMs = 1000 * 3600 * 24;

['2Y', '1Y', '2M', '5D', '3D', '1D'].forEach(timeRange => {
    const filtered = chart_data.filter((pt) => {
      const ptDate = new Date(pt.date).getTime();
      const diffDays = (ptDate - eventDate) / dayMs;
      
      switch (timeRange) {
        case '1Y': return Math.abs(diffDays) <= 180;
        case '2M': return Math.abs(diffDays) <= 30;
        case '5D': return diffDays >= -2 && diffDays <= 5;
        case '3D': return diffDays >= -2 && diffDays <= 3;
        case '1D': return diffDays >= -2 && diffDays <= 1;
        default: return true;
      }
    });
    console.log(timeRange, filtered.length);
});
