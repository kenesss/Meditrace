const response = $input.first().json;

// Extract key metrics
const lighthouseResult = response.lighthouseResult;
const categories = lighthouseResult.categories;
const audits = lighthouseResult.audits;

// Performance score (0-100)
const performanceScore = Math.round(categories.performance.score * 100);

// Core Web Vitals
const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
const fid = audits['max-potential-fid']?.displayValue || 'N/A';
const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';

return {
    json: {
        date: new Date().toISOString().split('T')[0],
        performance_score: performanceScore,
        lcp: lcp,
        fid: fid,
        cls: cls,
      full_report_url: response.id ? `https://pagespeed.web.dev/report?url=${encodeURIComponent($input.first().json.id)}` : 'N/A',
    }
};