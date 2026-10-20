// Street Goose 034: read-only Lighthouse reporting. No synthetic INP claims.
// Field INP must be measured with real user interactions and sufficient samples.
import { existsSync, readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const directory = resolve(process.argv[2] || 'lighthouse-reports');
if (!existsSync(directory)) {
  console.log('Lighthouse reports not yet available.');
  process.exitCode = 1;
} else {
  const files = readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
  if (!files.length) {
    console.error('No Lighthouse JSON reports found.');
    process.exitCode = 1;
  } else {
    const lines = [
      '## Street Goose 034 | Core Web Vitals (laboratorio) e SEO',
      '',
      '> Dados de laboratorio Lighthouse no dominio publicado. INP real requer navegacoes/interacoes reais (RUM).',
      '',
      '| Rota / Perfil | Performance | SEO | FCP | LCP | CLS | TBT | Transferencia |',
      '|---|---:|---:|---:|---:|---:|---:|---:|',
    ];
    let invalid = false;
    for (const file of files) {
      const name = file.replace(/\.json$/, '');
      let lhr;
      try { lhr = JSON.parse(readFileSync(join(directory, file), 'utf8')); }
      catch (e) { console.error('Invalid report', file, String(e)); invalid = true; continue; }
      const audits = lhr.audits || {};
      const duration = (id) => typeof audits[id]?.numericValue === 'number'
        ? (audits[id].numericValue / 1000).toFixed(2) + 's' : 'sem dados';
      const cls = typeof audits['cumulative-layout-shift']?.numericValue === 'number'
        ? audits['cumulative-layout-shift'].numericValue.toFixed(3) : 'sem dados';
      const score = (key) => lhr.categories?.[key] && typeof lhr.categories[key].score === 'number'
        ? String(Math.round(lhr.categories[key].score * 100)) : 'sem dados';
      const resources = (audits['network-requests']?.details?.items || []).filter((x) => x.url);
      const bytes = resources.reduce((total, x) => total + (x.transferSize || 0), 0);
      const mb = (bytes / 1048576).toFixed(2) + ' MB';
      lines.push(`| ${name} | ${score('performance')} | ${score('seo')} | ${duration('first-contentful-paint')} | ${duration('largest-contentful-paint')} | ${cls} | ${duration('total-blocking-time')} | ${mb} |`);
      console.log(`Lighthouse: ${name} | performance ${score('performance')} | SEO ${score('seo')} | LCP ${duration('largest-contentful-paint')} | CLS ${cls} | TBT ${duration('total-blocking-time')} | transfer ${mb}`);
      const top = [...resources].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 6);
      for (const request of top) {
        const url = new URL(request.url);
        console.log(`  ${((request.transferSize || 0) / 1048576).toFixed(2)} MB ${url.pathname.slice(0, 135)}`);
      }
      const status = audits['http-status-code'];
      if ((status?.score !== undefined && status.score !== 1) || !String(lhr.finalDisplayedUrl || lhr.finalUrl || '').includes('streetgoose034.com.br')) {
        invalid = true;
        console.error('Possible bot challenge, redirect or HTTP status issue: ' + name + ' / ' + (lhr.finalUrl || ''));
      }
      const isHome = name.startsWith('home');
      if (isHome && lhr.categories?.seo?.score != null && lhr.categories.seo.score < 0.8) {
        console.warn('SEO Lighthouse score needs review: ' + name);
      }
    }
    lines.push('', '**Interpretacao:** as pontuacoes sao sintéticas. Metas de boa experiencia: LCP <= 2,5s; CLS <= 0,1; INP <= 200ms com usuarios reais.', '');
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
    }
    if (invalid) process.exitCode = 1;
  }
}
